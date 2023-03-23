#!/usr/bin/python

from interface_main import *

agent_name = "Sim"

machines = [
 {"name": "Self","addr": "localhost"},
]

sensors = [
 {"name": "CAR",     "errRate": 3,  "warnRate": 6,  "topicName": "/CtrlStateFLG",                  "topicType": CtrlStateFLG},
 {"name": "GPS",     "errRate": 10, "warnRate": 60, "topicName": "/dynamic_global_pose",           "topicType": DynamicPoseWithCovar},
 {"name": "IBEO",    "errRate": 6,  "warnRate": 8,  "topicName": "/ibeo_object_set",               "topicType": IbeoObjectSet},
]

algs = [
 {"name": "Drv_A",    "errRate": 3,    "warnRate": 7,  "topicName": "/drivable_area_boundary_points",                                 "topicType": PointCloud2},
 {"name": "Vis_Sp",   "errRate": 3,    "warnRate": 7,  "topicName": "/visible_space_data",                                            "topicType": VisibleSpace},
 {"name": "VirtObj", "errRate": 3, "warnRate": 7,  "topicName": "/ailsv_virtual_objects",   "topicType": TrackedObjectSet},
 {"name": "WOS",      "errRate": 3,    "warnRate": 7,  "topicName": "/master_filter/health",                                          "topicType": DiagnosticArray},
 {"name": "M_Rte",    "errRate": 0.5,  "warnRate": 1,  "topicName": "/modia/route_plan/health",                                       "topicType": DiagnosticArray},
 #{"name": "M_Ma_Ab", "errRate": 0.5,  "warnRate": 1,  "topicName": "/modia/information/get_extracted_metric_map...",                  "topicType": TODO},
 {"name": "M_In_Ab",  "errRate": 0.5,  "warnRate": 1,  "topicName": "/modia/information/intersection",                                "topicType": IntersectionInformation},
 {"name": "M_Ve_Ab",  "errRate": 0.5,  "warnRate": 1,  "topicName": "/modia/information/vehicle",                                     "topicType": VehicleInformation},
 {"name": "M_Pe_Ab",  "errRate": 0.5,  "warnRate": 1,  "topicName": "/modia/information/pedestrian",                                  "topicType": PedestrianInformation},
 {"name": "M_Bl_Ab",  "errRate": 3,    "warnRate": 5,  "topicName": "/modia/information/blocking",                                    "topicType": BlockingInformation},
 {"name": "M_St_St",  "errRate": 3,    "warnRate": 5,  "topicName": "/modia/decision_components/stop_stop/decisions",                 "topicType": MODIADecisions},
 {"name": "M_St_Un",  "errRate": 3,    "warnRate": 5,  "topicName": "/modia/decision_components/stop_uncontrolled/decisions",         "topicType": MODIADecisions},
 {"name": "M_Un_Un",  "errRate": 3,    "warnRate": 5,  "topicName": "/modia/decision_components/uncontrolled_uncontrolled/decisions", "topicType": MODIADecisions},
 {"name": "M_Tr_Lt",  "errRate": 3,    "warnRate": 5,  "topicName": "/modia/decision_components/traffic_light/decisions",             "topicType": MODIADecisions},
 {"name": "M_Ped",    "errRate": 3,    "warnRate": 5,  "topicName": "/modia/decision_components/pedestrian/decisions",                "topicType": MODIADecisions},
 {"name": "M_Ln_Ch",  "errRate": 3,    "warnRate": 5,  "topicName": "/modia/decision_components/lane_change/decisions",               "topicType": MODIADecisions},
 {"name": "M_Ps_Ob",  "errRate": 3,    "warnRate": 5,  "topicName": "/modia/decision_components/pass_obstacle/decisions",             "topicType": MODIADecisions},
 {"name": "M_Arb",    "errRate": 1,    "warnRate": 5,  "topicName": "/modia/decision_components/arbiter_decision",                    "topicType": DecisionList},
 {"name": "Drv_Plan", "errRate": 3,    "warnRate": 5,  "topicName": "/drive_plan",                                                    "topicType": DriveGoalList},
 {"name": "TrajP",    "errRate": 5,    "warnRate": 8,  "topicName": "/lane_planner_state",                                            "topicType": LanePlannerState},
 # Humanising Autonomy
 {"name": "HuAu", "errRate": 3,    "warnRate": 5,  "topicName": "/humanising_autonomy",                                           "topicType": HumanisingAutonomy},
 {"name": "TrajC",    "errRate": 60,   "warnRate": 80, "topicName": "/lane_follower_state",                                           "topicType": TrajectoryControllerState},
]

cmds = [
  {"name": "ALL",       "command": " ", "nodes" : " "},
  {"name": "simulator", "command": "rosrun nrc_sim SimpleatorSimNode __name:=SimpleSimNode", "nodes" : "SimpleSimNode"},  
  {"name": "tf_sys",    "command": "roslaunch nrc_svcs leaf_tf_subsystem.launch sanborn:=true"},
  {"name": "world_mdl2","command": "roslaunch nrc_wm2_svcs leaf_pred.launch"},
  {"name": "auto_goals", "command": "rosrun nrc_ralp_svcs auto_goals", "inclByDef" : False},
  #{"name": "modia",     "command": "roslaunch nrc_dm_svcs modia_all.launch autonomy_level:=ad5"},
  {"name": "traj_plan", "command": "roslaunch nrc_ralp_svcs leaf_planner.launch use_predictor:=true publish_force_control:=true vehicle_type:=LeafFS"},
  #{"name": "rviz",      "command": "rosrun rviz rviz __name:=rviz_debug",   "nodes" : "rviz_debug",   "inclByDef" : False},
]

dest_list = [
    {"name": "BSM 0", "posX": 4014.40, "posY": -707.287, "posTh": 0.0},
    {"name": "BSM 1", "posX": 3448.89, "posY": -651.676, "posTh": 1.54},
    {"name": "BSM 2", "posX": 3411.23, "posY": -425.434, "posTh": 0.00},
    {"name": "BSM 3", "posX": 3336.58, "posY": -569.494, "posTh": 3.16},  
    {"name": "BSM 4", "posX": 3338.93, "posY": -905.174, "posTh": 3.16}, 
    {"name": "Arq 0", "posX": 4556.954, "posY": -1862.619, "posTh": -1.64},
    {"name": "Arq 1", "posX": 4938.08, "posY": -1861.480, "posTh": -1.59},
    {"name": "Oak 1", "posX": 4962.18, "posY": -2142.19, "posTh": 3.085},
    {"name": "Lab 2", "posX": 4803.49, "posY": -2236.08, "posTh": 0.0},
    #{"name": "Dest 0", "posX": 4695.0, "posY": -1138.0,  "posTh": -3.066},
    #{"name": "Dest 1", "posX": 4017.0, "posY": -776.0,   "posTh":  1.607},
    #{"name": "Dest 2", "posX": 3462.0, "posY": -648.0,   "posTh": -3.066},
    #{"name": "Dest 3", "posX": 3336.0, "posY": -596.0,   "posTh": -1.603},
    #{"name": "Dest 4", "posX": 3834.0, "posY": -1720.0,  "posTh": -1.603},
    #{"name": "Dest 5", "posX": 4907.0, "posY": -1862.0,  "posTh": 0.0},
    #{"name": "Dest 6", "posX": 4700.0, "posY": -2200.0,  "posTh": -3.066},
    #{"name": "3400 parking 7", "posX": 4820.66015625, "posY": -2270.52368164,  "posTh": -3.1365988},
    #{"name": "Cul-de-sac", "posX": 3610.3 , "posY": -735.0 , "posTh": 0.0},
]

multi_dest_list = [
    {"name": "Autonomy 5k v4", "dests": [
            #{"posX": 4735.066, "posY": -1827.617, "posTh": 1.54},
            #{"posX": 4590.261, "posY": -1319.800, "posTh": 0.0},
            #{"posX": 4053.639, "posY": -1085.373, "posTh": 0.0},
            #{"posX": 4020.345, "posY": -789.602, "posTh": 0.0},
            #{"posX": 3469.775, "posY": -647.087, "posTh": 0.0},
            #{"posX": 3332.936, "posY": -531.918, "posTh": 0.0},            
            #{"posX": 3338.210, "posY": -755.072, "posTh": 3.14},            
            #{"posX": 3550.670, "posY": -814.517, "posTh": -1.535},
            #{"posX": 3756.950, "posY": -884.409, "posTh": -1.535},
            #{"posX": 3781.480, "posY": -717.584, "posTh": 0.0},
            #{"posX": 3855.450, "posY": -770.428, "posTh": 3.18},
            #{"posX": 3938.400, "posY": -774.329, "posTh": 0.0},
            #{"posX": 3469.775, "posY": -647.087, "posTh": 0.0},
            #{"posX": 3338.210, "posY": -755.072, "posTh": 3.14},
            #{"posX": 4071.159, "posY": -1348.208, "posTh": 0.0},
            #{"posX": 4239.81, "posY": -1857.150, "posTh": -1.56},
            {"posX": 4191.960, "posY": -1856.890, "posTh": -1.56},
            {"posX": 4556.954, "posY": -1862.619, "posTh": -1.64},
            {"posX": 4961.606, "posY": -2097.672, "posTh": 3.15},
            #{"posX": 4962.030, "posY": -2134.030, "posTh": 3.15},
            {"posX": 4799.710, "posY": -2235.900, "posTh": 1.55},
            {"posX": 4781.070, "posY": -2262.660, "posTh": 3.15},
        ]
    },
    {"name": "Autonomy 5k Detour", "dests": [
            {"posX": 3332.936, "posY": -531.918, "posTh": 0.0},            
            {"posX": 3338.210, "posY": -755.072, "posTh": 3.14},            
            {"posX": 3550.670, "posY": -814.517, "posTh": -1.535},
            {"posX": 3756.950, "posY": -884.409, "posTh": -1.535},
            {"posX": 3781.480, "posY": -717.584, "posTh": 0.0},
            {"posX": 3855.450, "posY": -770.428, "posTh": 3.18},
            {"posX": 3938.400, "posY": -774.329, "posTh": 0.0},
            {"posX": 4011.640, "posY": -768.311, "posTh": -3.125},
            {"posX": 4091.800, "posY": -933.720, "posTh": -3.125},
        ]
    },
    {"name": "Auto5k, Short San Miguel", "dests": [
            {"posX": 4966.83, "posY": -1881.830, "posTh": 0.0}, #North on corvin, before Arques
            {"posX": 4482.840, "posY": -1662.82, "posTh": 0.0}, #North on Lakeside
            {"posX": 4590.261, "posY": -1319.800, "posTh": 0.0}, #Midas
            {"posX": 4053.639, "posY": -1085.373, "posTh": 0.0},#Right on Duane
            {"posX": 4020.345, "posY": -789.602, "posTh": 0.0},#North on San Tomas
            {"posX": 3469.775, "posY": -647.087, "posTh": 0.0},#West on Amador, before San Ramon
            {"posX": 3338.210, "posY": -755.072, "posTh": 3.14},#South on Santa Paula, before Coachella 
            {"posX": 3969.93, "posY": -1446.400, "posTh": 0.0},#South on Stewart
            {"posX": 4191.960, "posY": -1856.890, "posTh": -1.56},#East on Arques, before Lawrence
            {"posX": 4556.954, "posY": -1862.619, "posTh": -1.64},#East on Arques, after lakeside
            {"posX": 4961.606, "posY": -2097.672, "posTh": 3.15},#South on corvin, before central
            {"posX": 4799.710, "posY": -2235.900, "posTh": 1.55},#In SV pkg lot, main entry road
            {"posX": 4781.070, "posY": -2262.660, "posTh": 3.15},#Demo PUDO location
        ]
    },
    #{"name": "Autonomy 5k v3", "dests": [
            #{"posX": 4735.066, "posY": -1827.617, "posTh": 0.0},
            #{"posX": 4590.261, "posY": -1319.800, "posTh": 0.0},
            #{"posX": 4053.639, "posY": -1085.373, "posTh": 0.0},
            #{"posX": 4020.345, "posY": -789.602, "posTh": 0.0},
            #{"posX": 3469.775, "posY": -647.087, "posTh": 0.0},
            #{"posX": 3332.936, "posY": -531.918, "posTh": 0.0},
            #{"posX": 4071.159, "posY": -1348.208, "posTh": 0.0},            
            #{"posX": 3916.180, "posY": -1450.040, "posTh": 0.0},
            #{"posX": 3854.630, "posY": -1644.590, "posTh": 0.0},
            #{"posX": 4104.929, "posY": -1859.477, "posTh": 0.0},
            #{"posX": 4556.954, "posY": -1862.619, "posTh": 0.0},
            #{"posX": 4961.606, "posY": -2097.672, "posTh": 0.0},
            #{"posX": 4715.133, "posY": -2198.377, "posTh": 0.0},
        #]
    #},
    {"name": "Autonomy 5k Return Central", "dests": [
            {"posX": 4071.159, "posY": -1348.208, "posTh": 0.0},
            {"posX": 4104.929, "posY": -1859.477, "posTh": -1.56},
            {"posX": 4556.954, "posY": -1862.619, "posTh": -1.64},
            {"posX": 4664.87, "posY": -2151.16, "posTh": 1.56},
        ]
    },
    {"name": "Autonomy 5k Return Office", "dests": [
            {"posX": 4071.159, "posY": -1348.208, "posTh": 0.0},
            {"posX": 4104.929, "posY": -1859.477, "posTh": -1.56},
            {"posX": 4556.954, "posY": -1862.619, "posTh": -1.64},
            {"posX": 4961.606, "posY": -2097.672, "posTh": 0.0},
            {"posX": 4715.133, "posY": -2198.377, "posTh": 1.56},
        ]
    },
    {"name": "Route 1: Auto 5k", "dests": [
            {"posX": 4735.066, "posY": -1827.617, "posTh": 1.54}, #Arques
            {"posX": 4590.261, "posY": -1319.800, "posTh": 0.0}, #Midas
            {"posX": 4053.639, "posY": -1085.373, "posTh": 0.0},#Right on Duane
            {"posX": 4020.345, "posY": -789.602, "posTh": 0.0},#North on San Tomas
            {"posX": 3469.775, "posY": -647.087, "posTh": 0.0},#West on Amador, before San Ramon
            {"posX": 3332.936, "posY": -531.918, "posTh": 0.0},#South on Santa Paula, before Amador   
            {"posX": 3338.210, "posY": -755.072, "posTh": 3.14},#South on Santa Paula, before Coachella    
            {"posX": 3550.670, "posY": -814.517, "posTh": -1.535},#East on Coachella, before San Rafael
            {"posX": 3756.950, "posY": -884.409, "posTh": -1.535},#East on Colusa, before Santa Rosa
            {"posX": 3781.480, "posY": -717.584, "posTh": 0.0},#North on Santa Rosa
            {"posX": 3855.450, "posY": -770.428, "posTh": 3.18},#South on San Simeon
            {"posX": 3938.400, "posY": -774.329, "posTh": 0.0},#North on Santa Susana
            {"posX": 4013.660, "posY": -820.776, "posTh": 3.14},#South on San Tomas
            {"posX": 4054.660, "posY": -949.931, "posTh": 1.57},#West on Duane Ct, after Santa Ynez
        ]
    },
    {"name": "Route 2: Bootstrap", "dests": [
            {"posX": 4014.40, "posY": -707.287, "posTh": 0.0},
            {"posX": 3448.89, "posY": -651.676, "posTh": 1.54},
            {"posX": 3411.23, "posY": -425.434, "posTh": 0.00},
            {"posX": 3337.15, "posY": -640.820, "posTh": 3.16},
            {"posX": 3338.93, "posY": -905.174, "posTh": 3.16},

        ]
    },
    {"name": "Route 3: To Central", "dests": [
            {"posX": 4071.159, "posY": -1348.208, "posTh": 0.0},#South on Stewart
            {"posX": 4191.960, "posY": -1856.890, "posTh": -1.56},#East on Arques, before Lawrence
            {"posX": 4556.954, "posY": -1862.619, "posTh": -1.64},#East on Arques, after lakeside
            #{"posX": 4664.87, "posY": -2151.16, "posTh": 1.56},#Exit from Arques into Central
            {"posX": 4224.28, "posY": -2157.65, "posTh":1.56},#Right lane, West on Central, edge of map
        ]
    },
    {"name": "Route 4: After Insta", "dests": [
            {"posX": 4191.960, "posY": -1856.890, "posTh": -1.56},#East on Arques, before Lawrence
            {"posX": 4556.954, "posY": -1862.619, "posTh": -1.64},#East on Arques, after lakeside
            {"posX": 4961.606, "posY": -2097.672, "posTh": 3.15},#South on corvin, before central
            {"posX": 4799.710, "posY": -2235.900, "posTh": 1.55},#In SV pkg lot, main entry road
            {"posX": 4781.070, "posY": -2262.660, "posTh": 3.15},#Demo PUDO location
        ]
    },
]

interfaceHealth(agent_name, machines, sensors, algs, cmds, dest_list, multi_dest_list)

