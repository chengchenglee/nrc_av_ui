/* eslint-disable max-lines-per-function */
import { Button, Modal, message } from 'antd';
import jsYaml, { YAMLException } from 'js-yaml';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { configureMonacoYaml } from 'monaco-yaml';
import * as React from 'react';
import Editor from 'react-monaco-editor';
import './yamlEditorModal.scss';
import { ErrMsgEditor, ModeEditor } from '../../constants/editorYAML';
import {
  useAddInterface,
  useEditInterface,
  useGetInterfaceByName,
  useGetInterfaceList
} from '../../hooks/queries/interface';
import { parseYAMLInterface } from '../../utilities/converter';
import { replacePlaceholders } from '../../utilities/data';

const checkDependencyExists = (data: any, dependencyName: string): boolean =>
  data.some((obj: { name: string }) => obj.name === dependencyName);

const checkDependencies = (data: any): string => {
  for (const item of data) {
    if (item.depends) {
      for (const dependencyName of item.depends) {
        const dependency = data.find((obj: { name: string }) => obj.name === dependencyName);
        if (dependency?.depends && dependency.depends.includes(item.name)) {
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
    if (item.depends && item.depends.length > 0) {
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
}

export interface YamlEditorModalMethods {
  showModal: () => void;
}

const YamlEditorModal = React.forwardRef<YamlEditorModalMethods, IProps>((props, ref) => {
  const { currentPage, modeEditor } = props;
  const [mode, setMode] = React.useState('');
  const [content, setContent] = React.useState(props.content);
  const [newContent, setNewContent] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState('');
  const [, setIsEditorInitialized] = React.useState(false);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isModalConfirm, setIsModalConfirm] = React.useState(false);
  const [nameInterface, setNameInterface] = React.useState('');
  const [nameEditInterface, setNameEditInterface] = React.useState('');

  const { mutate: addInterface } = useAddInterface();

  const { mutate: updateInterface } = useEditInterface();

  const { data: dataInterface, isFetching } = useGetInterfaceByName(nameInterface);

  const { data, refetch } = useGetInterfaceList({ currentPage });

  React.useImperativeHandle(ref, () => ({
    showModal: () => {
      setIsModalOpen(true);
    }
  }));

  React.useMemo(() => {
    try {
      setMode(modeEditor);
      const parsedYaml = jsYaml.load(props.content) as YAML;
      const dataImport = parseYAMLInterface(parsedYaml);
      const isValid = validateFileYML(dataImport.subSystems);
      if (isValid !== '') {
        setErrorMessage(isValid);
      } else {
        setErrorMessage('');
      }
      const name = parsedYaml?.Configuration?.Name;
      setNameInterface(name);
      setNameEditInterface(name);
    } catch (e: unknown) {
      setErrorMessage((e as YAMLException).message);
    }
  }, [modeEditor, props.content]);

  const fetchData = React.useMemo(
    () => () => {
      if (!isFetching) {
        if (mode === ModeEditor.CREATE || !props.interfaceId) {
          const filteredData = data?.interfaces.filter((item) => item.name === nameEditInterface);
          if (filteredData?.length !== 0) {
            const msgErr = replacePlaceholders(ErrMsgEditor.INTERFACE_NAME_ALREADY_EXIST, {
              nameInterface: nameEditInterface
            });
            setErrorMessage(msgErr);
          }
        } else if (mode === ModeEditor.EDIT) {
          const filteredDataByNameEdit = data?.interfaces.filter(
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
      data?.interfaces,
      dataInterface?.name,
      isFetching,
      mode,
      nameEditInterface,
      nameInterface,
      props.interfaceId
    ]
  );

  React.useEffect(() => {
    fetchData();
  }, [content, fetchData, newContent]);

  const importInterface = React.useCallback(() => {
    const parsedYaml = jsYaml.load(content);
    const dataImport = parseYAMLInterface(parsedYaml, content);

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
  }, [addInterface, content, refetch]);

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
  }, [mode, props.interfaceId, importInterface, importHaveEditInterface, editInterface]);

  const handleYamlEditorCancel = () => {
    setIsModalConfirm(true);
    setIsModalOpen(false);
  };

  const handleOkClose = React.useCallback(() => {
    setIsModalConfirm(false);
    setErrorMessage('');
    setNameEditInterface('');
    setNameInterface('');
    monaco.editor.getModels()?.forEach((model) => {
      model.setValue(props.content);
    });
  }, [props.content]);

  const handleCancelClose = () => {
    setIsModalConfirm(false);
    setIsModalOpen(true);
  };

  const handleEditorChange = (newContent: string) => {
    setNewContent(newContent);
    setMode(ModeEditor.EDIT);
    try {
      const parsedYaml = jsYaml.load(newContent) as YAML;
      const dataImport = parseYAMLInterface(parsedYaml);
      setNameEditInterface(parsedYaml?.Configuration?.Name);
      // FIXME: return error in details
      const isValid = validateFileYML(dataImport.subSystems);
      if (isValid !== '') {
        setErrorMessage(isValid);
      } else {
        setErrorMessage('');
      }
    } catch (e: unknown) {
      setErrorMessage((e as YAMLException).message);
    }
  };

  const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
    language: 'yaml',
    theme: 'custom-yaml-theme', // Use the custom theme
    automaticLayout: true,
    autoIndent: 'full' // Enable full auto-indentation
  };

  React.useEffect(() => {
    const loadMonaco = () => {
      configureMonacoYaml(monaco);

      //Register the 'yaml' language
      monaco.languages.register({ id: 'yaml' });

      monaco.languages.setMonarchTokensProvider('yaml', {
        tokenizer: {
          root: [
            [/^.*?(?=:)/, 'key'],
            [/:([\s\S]*?)(?=$|\n)/, 'value']
          ]
        }
      });

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

      // Set the theme for the editor
      monaco.editor.setTheme('custom-yaml-theme');

      setIsEditorInitialized(true);
    };

    loadMonaco();
  }, []);

  React.useEffect(() => {
    setContent(props.content);
  }, [props.content]);

  return (
    <>
      <Modal
        width={'70vw'}
        style={{ maxHeight: '80vh' }}
        title={`Interface: ${nameEditInterface || nameInterface}`}
        open={isModalOpen}
        onCancel={handleYamlEditorCancel}
        maskClosable={false}
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
            <Button type="primary" disabled={!!errorMessage} onClick={() => handleOk()} key="Save">
              Save
            </Button>
          </>
        ]}
      >
        <div className="editor-container">
          <Editor
            language="yaml"
            value={content}
            options={editorOptions}
            onChange={handleEditorChange}
          />
        </div>
        {errorMessage ? (
          <div className="error-panel">
            <h3>Errors:</h3>
            <pre style={{ color: 'red' }}>{errorMessage}</pre>
          </div>
        ) : (
          <div></div>
        )}
      </Modal>
      <Modal
        width={400}
        onOk={handleOkClose}
        onCancel={handleCancelClose}
        title={`${nameEditInterface || nameInterface}`}
        open={isModalConfirm}
      >
        Closing the editor now will discard these changes. Are you sure you want to proceed and lose
        your modifications?
      </Modal>
    </>
  );
});

YamlEditorModal.displayName = 'YamlEditorModal';
export default YamlEditorModal;
