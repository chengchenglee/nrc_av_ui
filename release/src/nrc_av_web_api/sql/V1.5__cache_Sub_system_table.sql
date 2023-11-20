-- Execute the function
SELECT create_tables(ARRAY[
    (
      'cache_sub_system',
      'id SERIAL PRIMARY KEY, "subSystemSeq" VARCHAR NOT NULL, "interfaceId" INT NOT NULL'
    )
]::table_definition[]);

ALTER TABLE cache_sub_system ADD CONSTRAINT fk_interface FOREIGN KEY ("interfaceId") REFERENCES interface(id);
