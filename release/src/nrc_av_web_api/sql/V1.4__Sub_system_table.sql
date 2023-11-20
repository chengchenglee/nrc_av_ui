ALTER TABLE command
DROP CONSTRAINT fk_command_interface;

ALTER TABLE algorithm
DROP CONSTRAINT fk_algorithm_interface;

ALTER TABLE sensor
DROP CONSTRAINT fk_sensor_interface;

DROP TABLE command;
DROP TABLE algorithm;
DROP TABLE sensor;

-- Execute the function
SELECT create_tables(ARRAY[
    (
      'command',
      'id SERIAL PRIMARY KEY, "name" VARCHAR NOT NULL, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(), "isDeleted" bool NOT NULL DEFAULT false, "command" VARCHAR NOT NULL, nodes VARCHAR, "inclByDef" bool NOT NULL DEFAULT false, "autoStart" bool NOT NULL DEFAULT false, "autoRecord" bool NOT NULL DEFAULT false, "launchTime" float8 NOT NULL DEFAULT 0, "subSystemId" int4'
    ),
    (
      'topic',
      'id SERIAL PRIMARY KEY, "name" VARCHAR NOT NULL, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(), "isDeleted" bool NOT NULL DEFAULT false,"topicName" VARCHAR NOT NULL, "topicType" VARCHAR NOT NULL,"normalRate" float8 NOT NULL, "errRate" float8 NOT NULL, "warnRate" float8 NOT NULL, "subSystemId" int4'
    ),
    (
      'sub_system',
      'id SERIAL PRIMARY KEY, "name" VARCHAR NOT NULL, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(), "isDeleted" bool NOT NULL DEFAULT false,"description" VARCHAR, "diagLed" int4,"diagnostic" VARCHAR, "type" VARCHAR NOT NULL, "interfaceId" int4'
    ),
    (
      'sub_system_dependency',
      '"subSystemId" int4, "subSystemDependId" int4'
    )
]::table_definition[]);

ALTER TABLE command ADD CONSTRAINT fk_command_subSystem FOREIGN KEY ("subSystemId") REFERENCES sub_system(id);
ALTER TABLE topic ADD CONSTRAINT fk_topic_subSystem FOREIGN KEY ("subSystemId") REFERENCES sub_system(id);
ALTER TABLE sub_system ADD CONSTRAINT fk_sub_system_interface FOREIGN KEY ("interfaceId") REFERENCES interface(id);
ALTER TABLE sub_system_dependency ADD CONSTRAINT fk_sub_system_dependency_sub_system FOREIGN KEY ("subSystemId") REFERENCES sub_system(id);
ALTER TABLE sub_system_dependency ADD CONSTRAINT fk_sub_system_dependency_sub_system_depend FOREIGN KEY ("subSystemDependId") REFERENCES sub_system(id);
ALTER TABLE sub_system_dependency ADD PRIMARY KEY("subSystemId", "subSystemDependId");
