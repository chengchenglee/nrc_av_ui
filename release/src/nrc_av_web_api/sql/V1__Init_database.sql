-- Step 1: Create the composite type
CREATE TYPE table_definition AS (
    name text,
    columns text
);

-- Step 2: Create the function
CREATE OR REPLACE FUNCTION create_tables(tables_to_create table_definition[])
RETURNS VOID AS
$$
DECLARE
    table_data table_definition;
    table_name text;
    column_defs text;
BEGIN
    -- Loop through the array of table data
    FOREACH table_data IN ARRAY tables_to_create
    LOOP
        -- Extract the table name and column definitions
        table_name := table_data.name;
        column_defs := table_data.columns;

        -- Create the table using dynamic SQL
        EXECUTE format('CREATE TABLE %I (%s)', table_name, column_defs);
    END LOOP;
END;
$$
LANGUAGE plpgsql;

-- Step 2: Execute the function
SELECT create_tables(ARRAY[
    (
      'model',
      'id SERIAL PRIMARY KEY, name VARCHAR NOT NULL, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(), "isDeleted" bool NOT NULL DEFAULT false'
    ),
    (
      'interface',
      'id SERIAL PRIMARY KEY, name VARCHAR NOT NULL, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(), "isDeleted" bool NOT NULL DEFAULT false, "modelId" int4'
    ),
    (
      'algorithm',
      'id SERIAL PRIMARY KEY, name VARCHAR NOT NULL, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(), "isDeleted" bool NOT NULL DEFAULT false, "errRate" int4 NOT NULL, "warnRate" int4 NOT NULL, "topicName" VARCHAR NOT NULL, "topicType"  VARCHAR NOT NULL, "interfaceId" int4'
    ),
    (
      'command',
      'id SERIAL PRIMARY KEY, name VARCHAR NOT NULL, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(), "isDeleted" bool NOT NULL DEFAULT false, command VARCHAR NOT NULL, nodes VARCHAR, "inclByDef" bool NOT NULL DEFAULT false, "autoStart" bool NOT NULL DEFAULT false, "autoRecord" bool NOT NULL DEFAULT false, "interfaceId" int4'
    ),
    (
      'destination',
      'id SERIAL PRIMARY KEY, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(), "isDeleted" bool NOT NULL DEFAULT false, "posX" float8 NOT NULL, "posY" float8 NOT NULL, "posTh" float8 NOT NULL'
    ),
    (
      'interface_destination',
      'name VARCHAR NOT NULL, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(), "isDeleted" bool NOT NULL DEFAULT false, "interfaceId" int4, "destinationId" int4'
    ),
    (
      'machine',
      'id SERIAL PRIMARY KEY, name VARCHAR NOT NULL, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(), "isDeleted" bool NOT NULL DEFAULT false, addr VARCHAR NOT NULL, "interfaceId" int4'
    ),
    (
      'multi_destination',
      'id SERIAL PRIMARY KEY, name VARCHAR NOT NULL, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(), "isDeleted" bool NOT NULL DEFAULT false, "interfaceId" int4'
    ),
    (
      'node_list',

      '"createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(), "isDeleted" bool NOT NULL DEFAULT false, "vehicleId" int4, "rosNodeId" int4'
    ),
    (
      'ros_node',
      'id SERIAL PRIMARY KEY, name VARCHAR NOT NULL, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(), "isDeleted" bool NOT NULL DEFAULT false, "packageName" VARCHAR NOT NULL'
    ),
    (
      'sensor',
      'id SERIAL PRIMARY KEY, name VARCHAR NOT NULL, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(), "isDeleted" bool NOT NULL DEFAULT false, "errRate" float8 NOT NULL, "warnRate" float8 NOT NULL, "topicName" VARCHAR NOT NULL, "topicType" VARCHAR NOT NULL, "interfaceId" int4'
    ),
    (
      'user',
      'id SERIAL PRIMARY KEY, username VARCHAR NOT NULL UNIQUE, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(), "isDeleted" bool NOT NULL DEFAULT false, password VARCHAR NOT NULL'
    ),
    (
      'vehicle',
      'id SERIAL PRIMARY KEY, name VARCHAR NOT NULL, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(), "isDeleted" bool NOT NULL DEFAULT false, "macAddress" VARCHAR NOT NULL, "certKey" VARCHAR NOT NULL, "isOnline" bool NOT NULL DEFAULT false, "lastConnected" timestamp NOT NULL, status VARCHAR NOT NULL DEFAULT ''WAITING'', "agentVersion" VARCHAR, "modelId" int4'
    ),
    (
      'destination_list',
      '"multiDestinationId" int4 NOT NULL, "destinationId" int4 NOT NULL'
    ),
    (
      'user_interface',
      '"userId" int4 NOT NULL, "interfaceId" int4 NOT NULL'
    )
]::table_definition[]);

ALTER TABLE algorithm ADD CONSTRAINT fk_algorithm_interface FOREIGN KEY ("interfaceId") REFERENCES interface(id);
ALTER TABLE command ADD CONSTRAINT fk_command_interface FOREIGN KEY ("interfaceId") REFERENCES interface(id);
ALTER TABLE interface ADD CONSTRAINT fk_interface_model FOREIGN KEY ("modelId") REFERENCES model(id);
ALTER TABLE interface_destination ADD CONSTRAINT fk_interface_destination_interface FOREIGN KEY ("interfaceId") REFERENCES interface(id);
ALTER TABLE interface_destination ADD CONSTRAINT fk_interface_destination_destination FOREIGN KEY ("destinationId") REFERENCES destination(id);
ALTER TABLE machine ADD CONSTRAINT fk_machine_interface FOREIGN KEY ("interfaceId") REFERENCES interface(id);
ALTER TABLE multi_destination ADD CONSTRAINT fk_multi_destination_interface FOREIGN KEY ("interfaceId") REFERENCES interface(id);
ALTER TABLE node_list ADD CONSTRAINT fk_node_list_vehicle FOREIGN KEY ("vehicleId") REFERENCES vehicle(id);
ALTER TABLE node_list ADD CONSTRAINT fk_node_list_ros_node FOREIGN KEY ("rosNodeId") REFERENCES ros_node(id);
ALTER TABLE sensor ADD CONSTRAINT fk_sensor_interface FOREIGN KEY ("interfaceId") REFERENCES interface(id);
ALTER TABLE vehicle ADD CONSTRAINT fk_vehicle_model FOREIGN KEY ("modelId") REFERENCES model(id);
ALTER TABLE destination_list ADD CONSTRAINT fk_destination_list_multi_destination FOREIGN KEY ("multiDestinationId") REFERENCES multi_destination(id);
ALTER TABLE destination_list ADD CONSTRAINT fk_destination_list_destination FOREIGN KEY ("destinationId") REFERENCES destination(id);
ALTER TABLE destination_list ADD PRIMARY KEY("multiDestinationId", "destinationId");
ALTER TABLE user_interface ADD CONSTRAINT fk_user_interface_user FOREIGN KEY ("userId") REFERENCES "public"."user"(id);
ALTER TABLE user_interface ADD CONSTRAINT fk_user_interface_interface FOREIGN KEY ("interfaceId") REFERENCES interface(id);
ALTER TABLE user_interface ADD PRIMARY KEY("userId", "interfaceId");
