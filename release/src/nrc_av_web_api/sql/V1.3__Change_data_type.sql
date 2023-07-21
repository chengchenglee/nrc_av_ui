ALTER TABLE "public"."algorithm"
ALTER COLUMN "errRate" TYPE float8;

ALTER TABLE "public"."algorithm"
ALTER COLUMN "warnRate" TYPE float8;

ALTER TABLE "public"."sensor"
ALTER COLUMN "errRate" TYPE float8;

ALTER TABLE "public"."sensor"
ALTER COLUMN "warnRate" TYPE float8;
