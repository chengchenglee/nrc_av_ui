DROP TABLE IF EXISTS "public"."user";
-- This script only contains the table creation statements and does not fully represent the table in the database. It's still missing: indices, triggers. Do not use it as a backup.

-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS user_id_seq;

-- Table Definition
CREATE TABLE "public"."user" (
    "id" int4 NOT NULL DEFAULT nextval('user_id_seq'::regclass),
    "username" varchar NOT NULL,
    "password" varchar NOT NULL,
    "createdAt" timestamp NOT NULL,
    "updatedAt" timestamp NOT NULL,
    PRIMARY KEY ("id")
);

INSERT INTO "public"."user" ("username", "password", "createdAt", "updatedAt") VALUES
('nissan', '$2b$10$355FQx9GbLOqItYlpEiVFOHHOkSvjwffInyvG2.K/3/wULz9gZS3e',  NOW(), NOW());



