ALTER TABLE node_list
DROP CONSTRAINT fk_node_list_vehicle;

ALTER TABLE node_list
DROP CONSTRAINT fk_node_list_ros_node;

DROP TABLE node_list;
DROP TABLE ros_node;
