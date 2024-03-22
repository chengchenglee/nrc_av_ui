INSERT INTO "public"."user_role" ("roleId","userId") VALUES (1,1);
INSERT INTO "public"."user_role" ("roleId","userId") VALUES (2,2);

INSERT INTO "public"."permission" (name) VALUES ('read_status');
INSERT INTO "public"."permission" (name) VALUES ('allow_new_vehicle');
INSERT INTO "public"."permission" (name) VALUES ('create_interface');
INSERT INTO "public"."permission" (name) VALUES ('update_interface');
INSERT INTO "public"."permission" (name) VALUES ('read_interface');
INSERT INTO "public"."permission" (name) VALUES ('run_interface');
INSERT INTO "public"."permission" (name) VALUES ('run_subsystem');
INSERT INTO "public"."permission" (name) VALUES ('create_user');
INSERT INTO "public"."permission" (name) VALUES ('read_users');
INSERT INTO "public"."permission" (name) VALUES ('read_roles');
INSERT INTO "public"."permission" (name) VALUES ('read_permissions');
INSERT INTO "public"."permission" (name) VALUES ('delete_interface');

INSERT INTO "public"."role_permission" ("roleId","permissionId") VALUES (1,1);
INSERT INTO "public"."role_permission" ("roleId","permissionId") VALUES (1,2);
INSERT INTO "public"."role_permission" ("roleId","permissionId") VALUES (1,3);
INSERT INTO "public"."role_permission" ("roleId","permissionId") VALUES (1,4);
INSERT INTO "public"."role_permission" ("roleId","permissionId") VALUES (1,5);
INSERT INTO "public"."role_permission" ("roleId","permissionId") VALUES (1,6);
INSERT INTO "public"."role_permission" ("roleId","permissionId") VALUES (1,7);
INSERT INTO "public"."role_permission" ("roleId","permissionId") VALUES (1,8);
INSERT INTO "public"."role_permission" ("roleId","permissionId") VALUES (1,9);
INSERT INTO "public"."role_permission" ("roleId","permissionId") VALUES (1,10);
INSERT INTO "public"."role_permission" ("roleId","permissionId") VALUES (1,11);
INSERT INTO "public"."role_permission" ("roleId","permissionId") VALUES (1,12);

INSERT INTO "public"."role_permission" ("roleId","permissionId") VALUES (2,1);
INSERT INTO "public"."role_permission" ("roleId","permissionId") VALUES (2,3);
INSERT INTO "public"."role_permission" ("roleId","permissionId") VALUES (2,4);
INSERT INTO "public"."role_permission" ("roleId","permissionId") VALUES (2,5);
INSERT INTO "public"."role_permission" ("roleId","permissionId") VALUES (2,6);
INSERT INTO "public"."role_permission" ("roleId","permissionId") VALUES (2,7);
INSERT INTO "public"."role_permission" ("roleId","permissionId") VALUES (2,12);

INSERT INTO "public"."role_permission" ("roleId","permissionId") VALUES (3,1);
INSERT INTO "public"."role_permission" ("roleId","permissionId") VALUES (3,5);

