#!/usr/bin/python

from interface_main import *

agent_name = "Infrapod"

machines = [
 {"name": "Self","addr": "localhost"},
]

sensors = [
 {"name": "BaseGPS","errRate": 0.2,"warnRate": 0.3,"topicName": "/fix",                               "topicType": NavSatFix},
 {"name": "ARDUINO", "errRate": 1,  "warnRate": 5,  "topicName": "/trigger_health",                    "topicType": DiagnosticArray},
 {"name": "VLDY",    "errRate": 1,  "warnRate": 8,  "topicName": "/velodyne_packets",                  "topicType": VelodyneScan},
 {"name": "TC_F",    "errRate": 1,  "warnRate": 2,  "topicName": "/tower_cam_front/image_stamped",     "topicType": DiagnosticArray},
 {"name": "TC_FR",   "errRate": 1,  "warnRate": 2,  "topicName": "/tower_cam_frontRight/image_stamped","topicType": DiagnosticArray},
 {"name": "TC_FL",   "errRate": 1,  "warnRate": 2,  "topicName": "/tower_cam_frontLeft/image_stamped", "topicType": DiagnosticArray},
 {"name": "TC_B",    "errRate": 1,  "warnRate": 2,  "topicName": "/tower_cam_back/image_stamped",      "topicType": DiagnosticArray},
 {"name": "TC_BR",   "errRate": 1,  "warnRate": 2,  "topicName": "/tower_cam_backRight/image_stamped", "topicType": DiagnosticArray},
 {"name": "TC_BL",   "errRate": 1,  "warnRate": 2,  "topicName": "/tower_cam_backLeft/image_stamped",  "topicType": DiagnosticArray},
]

algs = [
 {"name": "DRV_A",  "errRate": 3,  "warnRate": 7,  "topicName": "/drivable_area_boundary_points",     "topicType": PointCloud2},
 {"name": "VIS_SP", "errRate": 3,  "warnRate": 7,  "topicName": "/visible_space_data",                "topicType": VisibleSpace},
]

cmds = [
  {"name": "ALL",      "command": " ", "nodes" : " ", "autoStart" : False, "autoRecord" : True},
  {"name": "gps",      "command": "rosrun nmea_gps_driver nmea_gps_driver.py __name:=gpsRx", "nodes" : "gpsRx", "inclByDef" : True},
  {"name": "arduino",  "command": "roslaunch nrc_hw_svcs arduino.launch"},
  {"name": "tf_sys",   "command": "roslaunch nrc_svcs leaf_tf_subsystem.launch sanborn:=true"},
  {"name": "velodyne", "command": "roslaunch velodyne_pointcloud VLS128_points.launch velodyne_machine:=local"},
  {"name": "FrontCam", "command": "roslaunch nrc_hw_svcs pgr_gige_camera.launch camera_name:=tower_cam_front      camera_serial:=20333016"},
  {"name": "FrLeftCam","command": "roslaunch nrc_hw_svcs pgr_gige_camera.launch camera_name:=tower_cam_frontLeft  camera_serial:=20247660"},
  {"name": "FrRghtCam","command": "roslaunch nrc_hw_svcs pgr_gige_camera.launch camera_name:=tower_cam_frontRight camera_serial:=20333017"},
  {"name": "BackCam",  "command": "roslaunch nrc_hw_svcs pgr_gige_camera.launch camera_name:=tower_cam_back       camera_serial:=20255297"},
  {"name": "BaLeft",   "command": "roslaunch nrc_hw_svcs pgr_gige_camera.launch camera_name:=tower_cam_backLeft   camera_serial:=20281728"},
  {"name": "BaRght",   "command": "roslaunch nrc_hw_svcs pgr_gige_camera.launch camera_name:=tower_cam_backRight  camera_serial:=20333024"},
  {"name": "vldy_proc","command": "roslaunch nrc_pcp_svcs pc_processor.launch Leaf_Foxtrot:=true Leaf_Charlie:=false", "inclByDef" : False},
  {"name": "cam_view", "command": "rosrun rqt_gui rqt_gui __name:=rqtgui", "nodes" : "rqtgui",       "inclByDef" : False},
  {"name": "rviz",     "command": "rosrun rviz rviz __name:=rviz_debug",   "nodes" : "rviz_debug",   "inclByDef" : False},
]
  
interfaceHealth(agent_name, machines, sensors, algs, cmds)
