-- Execute the function
SELECT create_tables(ARRAY[
    (
      'node',
      'id SERIAL PRIMARY KEY, "name" VARCHAR NOT NULL, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(), "isDeleted" bool NOT NULL DEFAULT false, "commandId" int4'
    )
]::table_definition[]);

ALTER TABLE node ADD CONSTRAINT fk_node_command FOREIGN KEY ("commandId") REFERENCES command(id);

ALTER TABLE command DROP COLUMN nodes
