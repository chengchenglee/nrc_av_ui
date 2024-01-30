/* eslint-disable max-lines-per-function */
import { Button, Modal, message } from 'antd';
import jsYaml, { YAMLException } from 'js-yaml';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { SchemasSettings, configureMonacoYaml } from 'monaco-yaml';
import * as React from 'react';
import Editor from 'react-monaco-editor';
import './yamlEditorModal.scss';
import schema from '../../../public/schemaInterface.json';
import { ErrMsgEditor, ModeEditor, Yaml } from '../../constants/editorYAML';
import {
  useAddInterface,
  useEditInterface,
  useGetContentByIdInterface,
  useGetInterfaceByName,
  useGetInterfaceList
} from '../../hooks/queries/interface';
import { parseYAMLInterface } from '../../utilities/converter';
import { replacePlaceholders } from '../../utilities/data';

const checkDependencyExists = (data: any, dependencyName: string): boolean =>
  data.some((obj: { name: string }) => obj.name === dependencyName);

const checkDependencies = (data: any): string => {
  for (const item of data) {
    if (item?.depends) {
      for (const dependencyName of item.depends) {
        const dependency = data.find((obj: { name: string }) => obj.name === dependencyName);
        if (dependency?.depends && dependency?.depends.includes(item.name)) {
          const errMsg = replacePlaceholders(ErrMsgEditor.DEPENDENCY_CIRCULAR, {
            subSystemName: item.name,
            dependencyName: dependency.name
          });
          return errMsg;
        }
      }
    }
  }
  return '';
};

const validateFileYML = (data: any) => {
  for (const item of data) {
    if (item?.depends && item?.depends.length > 0) {
      for (const dependencyName of item.depends) {
        if (!checkDependencyExists(data, dependencyName)) {
          const errMsg = replacePlaceholders(ErrMsgEditor.DEPENDENCY_NOT_EXIST, {
            subSystemName: item.name,
            dependencyName
          });
          // eslint-disable-next-line max-len
          return errMsg;
        } else if (checkDependencies(data)) {
          return checkDependencies(data);
        }
      }
    }
  }
  return '';
};

const generateKey = (marker: any) =>
  `${marker.severity}-${marker.startLineNumber}-${marker.startColumn}-${marker.message}`;

const transformErrorMessage = <T,>(keys: Record<keyof T, 1>) => {
  const result: string[] = [];
  const keysInObject = Object.keys(keys) as Array<keyof T>;
  keysInObject.forEach((key) => {
    result.push(`Message: Missing property ${String(key)}. /nLine: 1`);
  });
  return result;
};

interface IProps {
  interfaceId: number | undefined;
  content: string;
  currentPage: number;
  modeEditor: string;
}

interface YAML {
  Configuration: {
    Name: string;
  };
  Subsystem: {
    Type: string;
    Description: string | null;
    Depends: string | null;
    Commands: {
      Name: string;
      Command: string;
      Type: string;
      LaunchTime: number | null;
      Node: string | null;
    };
    HealthTopics: {
      HealthTopic: string;
      HealthName: string;
      HealthTopicType: string;
      NomWarnErrRate: string;
    };
    DiagLED?: number | null;
    Timeout?: number | null;
    DiagRetry?: number | null;
    Diagnostic?: {
      Retry: number;
      Timeout: number;
      LED: number;
      File: string;
    };
  };
}

export interface YamlEditorModalMethods {
  showModal: () => void;
}

const YamlEditorModal = React.forwardRef<YamlEditorModalMethods, IProps>((props, ref) => {
  const { currentPage, modeEditor } = props;
  const [mode, setMode] = React.useState('');
  const [newContent, setNewContent] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isModalConfirm, setIsModalConfirm] = React.useState(false);
  const [nameInterface, setNameInterface] = React.useState('');
  const [nameEditInterface, setNameEditInterface] = React.useState('');
  const [markers, setMarkers] = React.useState<monaco.editor.IMarker[]>([]);
  const [modelEditor, setModelEditor] = React.useState<monaco.editor.ITextModel | null>(null);

  const { data: contentInterface, isFetching: isFetchingInterface } = useGetContentByIdInterface(
    props.interfaceId
  );

  const { mutate: addInterface } = useAddInterface();

  const { mutate: updateInterface } = useEditInterface();

  const { data: dataInterface, isFetching } = useGetInterfaceByName(nameInterface);

  const { data: listInterfaces, refetch } = useGetInterfaceList({ currentPage });

  React.useImperativeHandle(ref, () => ({
    showModal: () => {
      setIsModalOpen(true);
    }
  }));

  const contentInterfaceData = React.useMemo(() => {
    if (isFetchingInterface) {
      return null;
    }
    if (contentInterface) {
      return contentInterface.data.content;
    }
    return props.content;
  }, [contentInterface, isFetchingInterface, props.content]);

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    if (editor) {
      const model = editor.getModel();
      if (model) {
        setModelEditor(model);
        editor.onDidDispose(() => {
          setMarkers([]);
          monaco.editor.setModelMarkers(model, 'yaml', []);
        });
      }
    }
  };

  React.useMemo(() => {
    try {
      setMode(modeEditor);
      if (!contentInterfaceData) {
        return;
      }
      const parsedYaml = jsYaml.load(contentInterfaceData) as YAML;
      const dataImport = parseYAMLInterface(parsedYaml);
      const isValid = validateFileYML(dataImport.subSystems);
      if (isValid !== '') {
        setErrorMessage(isValid);
      } else {
        setErrorMessage('');
      }
      const interfaceName = parsedYaml?.Configuration?.Name;
      if (interfaceName) {
        setNameInterface(interfaceName);
        setNameEditInterface(interfaceName);
      }
    } catch (e: unknown) {
      setErrorMessage((e as YAMLException).message);
    }
  }, [modeEditor, contentInterfaceData]);

  const fetchData = React.useMemo(
    () => () => {
      if (!isFetching) {
        if (mode === ModeEditor.CREATE || !props.interfaceId) {
          const filteredData = listInterfaces?.interfaces.filter(
            (item) => item.name === nameEditInterface
          );
          if (filteredData?.length !== 0) {
            const msgErr = replacePlaceholders(ErrMsgEditor.INTERFACE_NAME_ALREADY_EXIST, {
              nameInterface: nameEditInterface
            });
            setErrorMessage(msgErr);
          }
        } else if (mode === ModeEditor.EDIT) {
          const filteredDataByNameEdit = listInterfaces?.interfaces.filter(
            (item) => item.name === nameEditInterface
          );
          if (nameEditInterface !== nameInterface && filteredDataByNameEdit?.length !== 0) {
            if (dataInterface?.name) {
              const msgErr = replacePlaceholders(ErrMsgEditor.INTERFACE_NAME_ALREADY_EXIST, {
                nameInterface: nameEditInterface
              });
              setErrorMessage(msgErr);
            }
          }
        }
      }
    },
    [
      dataInterface?.name,
      isFetching,
      listInterfaces?.interfaces,
      mode,
      nameEditInterface,
      nameInterface,
      props.interfaceId
    ]
  );

  const importInterface = React.useCallback(() => {
    if (!contentInterfaceData) {
      return;
    }

    const parsedYaml = jsYaml.load(contentInterfaceData);
    const dataImport = parseYAMLInterface(parsedYaml, contentInterfaceData);

    addInterface(dataImport, {
      onSuccess: () => {
        message.success('Add interface success');
        refetch();
      },
      onError: (error: any) => {
        if (error.response.data.message !== undefined) {
          message.error(error.response.data.message);
        } else {
          message.error('An error occurred while attempting to import the Interface');
        }
      }
    });
  }, [addInterface, contentInterfaceData, refetch]);

  const importHaveEditInterface = React.useCallback(() => {
    const parsedYaml = jsYaml.load(newContent);
    const dataImport = parseYAMLInterface(parsedYaml, newContent);

    addInterface(dataImport, {
      onSuccess: () => {
        message.success('Add interface success');
        refetch();
      },
      onError: (error: any) => {
        if (error.response.data.message !== undefined) {
          message.error(error.response.data.message);
        } else {
          message.error('An error occurred while attempting to import the Interface');
        }
      }
    });
  }, [addInterface, newContent, refetch]);

  const editInterface = React.useCallback(() => {
    const parsedYaml = jsYaml.load(newContent);
    const dataImport = parseYAMLInterface(parsedYaml, newContent);
    if (newContent.length === 0) {
      message.success('Edit interface success');
      return;
    }
    if (!props.interfaceId) {
      return;
    }
    updateInterface(
      { id: props.interfaceId, data: dataImport },
      {
        onSuccess: () => {
          message.success('Edit interface success');
          refetch();
        },
        onError: (error: any) => {
          if (error.response.data.message !== undefined) {
            message.error(error.response.data.message);
          } else {
            message.error('An error occurred while attempting to edit the Interface');
          }
        }
      }
    );
  }, [props.interfaceId, newContent, updateInterface, refetch]);

  const handleOk = React.useCallback(() => {
    setIsModalOpen(false);
    if (mode === ModeEditor.CREATE) {
      importInterface();
    } else if (mode === ModeEditor.EDIT && !props.interfaceId) {
      importHaveEditInterface();
    } else if (mode === ModeEditor.EDIT && props.interfaceId) {
      editInterface();
    }
    setErrorMessage('');
    setNameEditInterface('');
    setNameInterface('');
    setNewContent('');
    modelEditor?.dispose();
  }, [
    editInterface,
    importHaveEditInterface,
    importInterface,
    mode,
    modelEditor,
    props.interfaceId
  ]);

  const handleYamlEditorCancel = () => {
    setIsModalConfirm(true);
    setIsModalOpen(false);
  };

  const handleOkClose = React.useCallback(() => {
    setErrorMessage('');
    setNameEditInterface('');
    setNameInterface('');
    setNewContent('');
    modelEditor?.dispose();
    setIsModalConfirm(false);
  }, [modelEditor]);

  const handleCancelClose = () => {
    setIsModalConfirm(false);
    setIsModalOpen(true);
  };

  const handleEditorChange = (newContent: string) => {
    if (newContent.trim().length === 0) {
      setErrorMessage(transformErrorMessage<YAML>({ Configuration: 1, Subsystem: 1 }).join('/n'));
      return;
    } else {
      setErrorMessage('');
    }

    setNewContent(newContent);
    setMode(ModeEditor.EDIT);
    try {
      const parsedYaml = jsYaml.load(newContent) as YAML;

      const dataImport = parseYAMLInterface(parsedYaml);

      setNameEditInterface(parsedYaml?.Configuration?.Name);

      const isValid = validateFileYML(dataImport.subSystems);
      if (isValid !== '') {
        setErrorMessage(isValid);
      } else {
        setErrorMessage('');
      }
    } catch (e: unknown) {
      const yamlException = e as YAMLException;
      if (yamlException.name === Yaml.YAML_EXCEPTION) {
        setErrorMessage(yamlException.message);
      }
    }
  };

  const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
    language: 'yaml',
    theme: 'custom-yaml-theme', // Use the custom theme
    automaticLayout: true,
    autoIndent: 'full', // Enable full auto-indentation
    quickSuggestions: {
      other: true,
      comments: false,
      strings: true
    }
  };

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  React.useEffect(() => {
    const defaultSchema: SchemasSettings = {
      uri: '/schemaInterface.json',
      schema: [schema],
      fileMatch: ['*']
    };

    // Define a custom theme based on 'vs-dark'
    monaco.editor.defineTheme('custom-yaml-theme', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        // Customize keyword color (blue)
        { token: 'key', foreground: '569CD6', fontStyle: 'bold' },
        // Customize key color (green)
        { token: 'value', foreground: 'DCDCAA' },
        // Customize keyword color (blue)
        { token: 'identifier', foreground: '#569CD6' },
        { token: 'identifier.function', foreground: 'DCDCAA' },
        { token: 'type', foreground: '1AAFB0' }
        // Define other styles as needed to match VSCode's dark theme
      ],
      colors: {
        // Define custom colors here, if needed
      }
    });

    const loadMonaco = () =>
      configureMonacoYaml(monaco, {
        enableSchemaRequest: true,
        schemas: [defaultSchema]
      });

    loadMonaco();
  }, []);

  React.useEffect(() => {
    if (modelEditor) {
      modelEditor.onDidChangeDecorations(() => {
        const modelMarkers = monaco.editor.getModelMarkers({
          resource: modelEditor.uri,
          owner: 'yaml'
        });
        if (modelMarkers.length > 0 || !contentInterfaceData) {
          setMarkers(modelMarkers);
        } else {
          setMarkers([]);
        }
      });
    }
  }, [contentInterfaceData, markers, modelEditor]);

  return (
    <>
      <Modal
        width={'70vw'}
        style={{ maxHeight: '80vh' }}
        title={`Interface: ${nameEditInterface || nameInterface}`}
        open={isModalOpen}
        onCancel={handleYamlEditorCancel}
        maskClosable={false}
        destroyOnClose
        footer={[
          <>
            <Button
              onClick={() => {
                handleYamlEditorCancel();
              }}
              key="Cancel"
            >
              Cancel
            </Button>
            <Button
              type="primary"
              disabled={!!errorMessage || markers.length > 0}
              onClick={() => handleOk()}
              key="Save"
            >
              Save
            </Button>
          </>
        ]}
      >
        {contentInterfaceData || mode === ModeEditor.CREATE || newContent ? (
          <div className="editor-container">
            <Editor
              language="yaml"
              value={contentInterfaceData || newContent}
              options={editorOptions}
              onChange={handleEditorChange}
              editorDidMount={handleEditorDidMount}
            />
          </div>
        ) : null}
        {markers.length > 0 || errorMessage ? (
          <div className="error-panel">
            <h3>Errors:</h3>
            {errorMessage && (
              <div>
                {errorMessage.split('/n').map((item, idx) => (
                  <pre key={item + idx} style={{ color: 'red' }}>
                    {item}
                  </pre>
                ))}
              </div>
            )}
            {!isFetchingInterface &&
              markers.map((marker) => (
                <div key={generateKey(marker)}>
                  <pre style={{ color: 'red' }}>Message: {marker.message}</pre>
                  <pre style={{ color: 'red' }}>Line: {marker.startLineNumber}</pre>
                </div>
              ))}
          </div>
        ) : (
          <></>
        )}
      </Modal>
      <Modal
        width={400}
        onOk={handleOkClose}
        onCancel={handleCancelClose}
        title={`${nameEditInterface || nameInterface}`}
        open={isModalConfirm}
        destroyOnClose
      >
        Closing the editor now will discard these changes. Are you sure you want to proceed and lose
        your modifications?
      </Modal>
    </>
  );
});

YamlEditorModal.displayName = 'YamlEditorModal';
export default YamlEditorModal;
