#!/usr/bin/env python

# Ros Messages
import rospy
import time
from geometry_msgs.msg import Pose
from nrc_msgs.msg import MODIARoutePlanDestinations
import tf

# Image display
import os

MULTI_DEST_LIST = [
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
    {"name": "Autonomy 5k v4", "dests": [
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
            {"posX": 3469.775, "posY": -647.087, "posTh": 0.0},#East on Amador, before San Ramon
            {"posX": 3338.210, "posY": -755.072, "posTh": 3.14},#South on Santa Paula, before Coachella 
            {"posX": 4071.159, "posY": -1348.208, "posTh": 0.0},#South on Stewart
            {"posX": 4191.960, "posY": -1856.890, "posTh": -1.56},#East on Arques, before Lawrence
            {"posX": 4556.954, "posY": -1862.619, "posTh": -1.64},#East on Arques, after lakeside
            {"posX": 4961.606, "posY": -2097.672, "posTh": 3.15},#South on corvin, before central
            {"posX": 4799.710, "posY": -2235.900, "posTh": 1.55},#In SV pkg lot, main entry road
            {"posX": 4781.070, "posY": -2262.660, "posTh": 3.15},#Demo PUDO location
        ]
    },
    {"name": "Auto5k, Short San Miguel", "dests": [
            {"posX": 4735.066, "posY": -1827.617, "posTh": 1.54}, #Arques
            {"posX": 4590.261, "posY": -1319.800, "posTh": 0.0}, #Midas
            {"posX": 4053.639, "posY": -1085.373, "posTh": 0.0},#Right on Duane
            {"posX": 4020.345, "posY": -789.602, "posTh": 0.0},#North on San Tomas
            {"posX": 3469.775, "posY": -647.087, "posTh": 0.0},#West on Amador, before San Ramon
            {"posX": 3338.210, "posY": -755.072, "posTh": 3.14},#South on Santa Paula, before Coachella 
            {"posX": 4071.159, "posY": -1348.208, "posTh": 0.0},#South on Stewart
            {"posX": 4191.960, "posY": -1856.890, "posTh": -1.56},#East on Arques, before Lawrence
            {"posX": 4556.954, "posY": -1862.619, "posTh": -1.64},#East on Arques, after lakeside
            {"posX": 4961.606, "posY": -2097.672, "posTh": 3.15},#South on corvin, before central
            {"posX": 4799.710, "posY": -2235.900, "posTh": 1.55},#In SV pkg lot, main entry road
            {"posX": 4781.070, "posY": -2262.660, "posTh": 3.15},#Demo PUDO location
        ]
    },
]

class MultiSetDest:
  def __init__(self, multiDestNameIn, destsIn):
    self.multiDestName = multiDestNameIn
    self.dests = destsIn
    self.advertised = False

  def command(self):
    print("Send destinations: ", self.multiDestName)

    if self.advertised == False:
      self.publisher = rospy.Publisher("/modia/route_plan/destinations", MODIARoutePlanDestinations, queue_size=1)
      self.advertised = True

    msg = MODIARoutePlanDestinations()
    msg.header.frame_id = "site"
    msg.header.stamp = rospy.Time.now()

    for dest in self.dests:
      newDest = Pose()

      newDest.position.x = dest["posX"]
      newDest.position.y = dest["posY"]

      quaternion = tf.transformations.quaternion_from_euler(0, 0, dest["posTh"])
      newDest.orientation.x = quaternion[0]
      newDest.orientation.y = quaternion[1]
      newDest.orientation.z = quaternion[2]
      newDest.orientation.w = quaternion[3]

      msg.destinations += [newDest]
    
    self.publisher.publish(msg)
        

