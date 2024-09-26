import json
import numpy as np
import rospy
from std_msgs.msg import String

try:
  from pyproj import Proj
  
  # site_originLat = rospy.get_param('/siteFrame/originLat', 37.397186956864289) 
  # site_originLng = rospy.get_param('/siteFrame/originLon', -122.04398000000006)
  site_originLat = 37.397186956864289
  site_originLng = -122.04398000000006
  projection = f"+proj=tmerc +lat_0={site_originLat} +lon_0={site_originLng} +x_0=0.0 +y_0=0.0 +units=m +ellps=GRS80 +datum=WGS84 +k_0=0.9999"
  proj = Proj(projection)
except ImportError:
  print("pyproj not found.")


class WaypointEntry:
  def __init__(self,dataIn):
    self.value = []
    self.x  = dataIn[0]
    self.y  = dataIn[1]
    self.th = dataIn[2]
    
  def toStr(self):
    csvStr = ','+str(self.x)+','+str(self.y)+','+str(self.th)
    return csvStr

class WaypointData:
  def __init__(self,waypointsList = []):
    self.waypoints = []
    for i in range(len(waypointsList)):
      self.waypoints.append(WaypointEntry(waypointsList[i]))
    
  def toMsg(self):
    csvStr = ''
    csvStr = 'w'
    for i in range(len(self.waypoints)):
      csvStr += self.waypoints[i].toStr()
    #print('mqtt_defs, toMsg:\n'+str(csvStr))
    return csvStr
    

  def fromMsg(self, msgIn):
    """
    
    MSPF waypoint message parser. The function converts mqtt message of MSPF waypoints into ROS message for Waypoint-Manager to consume. 
    The message parser supports both coordinates in local frame and gps frame. A prefix is needed for the parser to decided which frame the data is using in order to parser them correctly.    
    
    examples of msgIn['data']: 
     (a) in gps frame
        g,37.376772997694076,-121.99000214332065,180.0,37.37668230057641,-121.98960226376005,90.0,37.37676764380664,-121.98919009633372,0.0,37.37702982375583,-121.9895780755291,270.0

      -append prefix 'g' in the front of the coordinates

     (b) in local frame
        w,4780.3706247408245,-2264.0478922730467,4.71238898038469,4815.79043911781,-2274.092552443286,0.0,4852.2872351835285,-2264.6005943053697,1.5707963267948966,4817.910363492513,-2235.525408055795,3.141592653589793

      -append prefix 'w' in the front of the coordinates
    """


    payload = msgIn['data'] # g,37.376772997694076,-121.99000214332065,180.0,37.37668230057641,-121.98960226376005,90.0,37.37676764380664,-121.98919009633372,0.0,37.37702982375583,-121.9895780755291,270.0

    for lineData in msgIn['data']:
      if lineData[0] == 'w':   #w,4780.3706247408245,-2264.0478922730467,4.71238898038469,4815.79043911781,-2274.092552443286,0.0,4852.2872351835285,-2264.6005943053697,1.5707963267948966,4817.910363492513,-2235.525408055795,3.141592653589793
        self.waypoints = []
        numPoints = int((len(lineData)-1)/3)
        for i in range(numPoints):
          groupIdx = 1+3*i
          cur_lineData =  [float(k) for k in lineData[groupIdx:groupIdx+3]]
          self.waypoints.append(WaypointEntry(cur_lineData))

      if lineData[0] == 'g':
        self.waypoints = []
        numPoints = int((len(lineData)-1)/3)
        for i in range(numPoints):
          groupIdx = 1+3*i
          cur_lineData =  [float(k) for k in lineData[groupIdx:groupIdx+3]]  
          posX, posY = proj(cur_lineData[1],cur_lineData[0])
          posTh = ((-cur_lineData[2] + 90) * np.pi / 180 ) % (2*np.pi)
          wp = [posX, posY, posTh]
          self.waypoints.append(WaypointEntry(wp))
    if False:
      for i in range(len(self.waypoints)):
        print('Waypoint '+str(i)+'=>'+self.waypoints[i].toStr())



  def fromMsg_jsonParser(self, msgIn):
    """
    {
      "name": "NATCSV_raw_route", "wps":[
        {"lat": 37.376772997694076, "lon":  -121.99000214332065, "heading": 180.0},
        {"lat": 37.37668230057641, "lon":  -121.98960226376005, "heading": 90.0},
        {"lat": 37.37676764380664, "lon":  -121.98919009633372,  "heading": 0.0},
        {"lat": 37.37702982375583, "lon":  -121.9895780755291, "heading": 270.0}
      ]
    }
    
    """
    
    print(msgIn)
    
    payload = msgIn['data']
    wps = payload["wps"]

    if "lat" in wps[0].keys():
      #convert lat,lon,heading to x,y,theta
      for wp in wps:
        posX, posY = proj(wp["lon"],wp["lat"])
        posTh = ((-wp['heading'] + 90) * np.pi / 180 ) % (2*np.pi)
        wp['posX'] = posX
        wp['posY'] = posY
        wp['posTh'] = posTh
    
    for wp in wps:
      self.waypoints.append(WaypointEntry([wp['posX'], wp['posY'], wp['posTh']]))
