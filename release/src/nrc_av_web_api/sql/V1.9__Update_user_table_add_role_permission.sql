ALTER TABLE "public"."user" ADD COLUMN "email" VARCHAR;
ALTER TABLE "public"."user" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "public"."user" ADD COLUMN "shouldChangePasswordOnNextLogin" BOOLEAN DEFAULT TRUE;

--/* Hardcoded to update admin - developer default email account */--
UPDATE "public"."user" SET email = 'admin_nissan@gmail.com' WHERE id = 1;
UPDATE "public"."user" SET "isActive" = true WHERE id = 1;
UPDATE "public"."user" SET "shouldChangePasswordOnNextLogin" = false WHERE id = 1;
UPDATE "public"."user" SET email = 'user_nissan@gmail.com' WHERE id = 2;
UPDATE "public"."user" SET "isActive" = true WHERE id = 2;
UPDATE "public"."user" SET "shouldChangePasswordOnNextLogin" = false WHERE id = 2;

ALTER TABLE public.user ALTER COLUMN "email" SET NOT NULL;

SELECT create_tables(ARRAY[
    (
        'role',
        'id SERIAL PRIMARY KEY, "name" VARCHAR NOT NULL, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(), "isDeleted" bool NOT NULL DEFAULT false'
    ),
    (
        'permission',
        'id SERIAL PRIMARY KEY, "name" VARCHAR NOT NULL, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(), "isDeleted" bool NOT NULL DEFAULT false'
    ),
    (
        'role_permission',
        '"roleId" SERIAL, "permissionId" SERIAL'
    ),
    (
        'user_role',
        '"roleId" SERIAL, "userId" SERIAL'
    )
]::table_definition[]);

INSERT INTO "public"."role" (name) VALUES ('admin');
INSERT INTO "public"."role" (name) VALUES ('engineer');
INSERT INTO "public"."role" (name) VALUES ('viewer');

ALTER TABLE user_role ADD CONSTRAINT fk_user_role_user FOREIGN KEY ("userId") REFERENCES "public"."user" (id);
ALTER TABLE user_role ADD CONSTRAINT fk_user_role_role FOREIGN KEY ("roleId") REFERENCES "public"."role" (id);
ALTER TABLE user_role ADD PRIMARY KEY("userId", "roleId");

ALTER TABLE role_permission ADD CONSTRAINT fk_role_permission_role FOREIGN KEY ("roleId") REFERENCES "public"."role" (id);
ALTER TABLE role_permission ADD CONSTRAINT fk_role_permission_permission FOREIGN KEY ("permissionId") REFERENCES "public"."permission" (id);
ALTER TABLE role_permission ADD PRIMARY KEY("roleId", "permissionId");

-- Avoid error initial create user --
SELECT setval('user_id_seq', (SELECT MAX(id) FROM "user"));