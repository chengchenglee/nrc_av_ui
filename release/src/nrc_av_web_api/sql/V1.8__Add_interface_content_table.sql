-- Execute the function
SELECT create_tables(ARRAY[
    (
      'interface_content',
      'id SERIAL PRIMARY KEY, "content" TEXT, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(), "isDeleted" bool NOT NULL DEFAULT false, "interfaceId" int4'
    )
]::table_definition[]);

ALTER TABLE interface_content ADD CONSTRAINT fk_interface_content_interface FOREIGN KEY ("interfaceId") REFERENCES interface(id);
