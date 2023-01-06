#!/usr/bin/python

from interface_perc import *

import argparse

agent_name = "Advanced Engineering"

machines = [
 {"name": "Self","addr": "localhost"},
]

sensors = [
 {"name": "POSE","errRate": 1,"warnRate": 9,"topicName": "/CAN/Odometry", "topicType": PoseWithCovarianceStamped},
 {"name": "LUM", "errRate": 1,  "warnRate": 5,  "topicName": "/luminar_pointcloud", "topicType": PointCloud2},
]

algs = [
 {"name": "DRV_A",  "errRate": 3,  "warnRate": 7,  "topicName": "/drivable_area_boundary_points", "topicType": PointCloud2},
 {"name": "TOS", "errRate": 3,  "warnRate": 7,  "topicName": "/pc_processor/multi_object_tracker/tracked_object_set_car_frame", "topicType": TrackedObjectSet},
]

cmds = [
  {"name": "ALL",      "command": " ", "nodes" : " ", "autoStart" : False, "autoRecord" : False},
  {"name": "luminar_driver", "command": "roslaunch luminar_ros luminar_lidar.launch"},
  {"name": "pose_udp_rec", "command": "roslaunch nrc_pcp_svcs xe0_udp_receive.launch"},
  {"name": "pc_proc_udp_send", "command": "roslaunch nrc_pcp_svcs pc_processor_udp_send.launch"},
  {"name": "pc_proc", "command": "roslaunch nrc_pcp_svcs xe0_pc_processor.launch"},
  {"name": "rviz",   "command": "rosrun rviz rviz -d src/nrc_svcs/config/pc_processor_xe0.rviz __name:=rviz_debug",  "nodes" : "rviz_debug"},
]

record_cmd = "roslaunch nrc_svcs record_separately_xe0.launch"

def main():
  argparser = argparse.ArgumentParser("XE0Interface", formatter_class=argparse.ArgumentDefaultsHelpFormatter)
  argparser.add_argument("--mode", type=str, required=True, help="Data mode - either live or bagfile", choices={"live", "bagfile"})
  args = argparser.parse_args()
  
  mode = args.mode

  interfaceHealth(agent_name, machines, sensors, algs, cmds, record_cmd, mode)

if __name__ == "__main__":
    main()

