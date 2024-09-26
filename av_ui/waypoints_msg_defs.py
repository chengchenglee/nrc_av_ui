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
    
    payload = msgIn['data'] #json.loads(msgIn['data'])
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


    # for lineData in msgIn['data']:
    #   if lineData[0] == 'w':
    #     self.waypoints = []
    #     numPoints = (len(lineData)-1)/3
    #     for i in range(numPoints):
    #       groupIdx = 1+3*i
    #       self.waypoints.append(WaypointEntry(lineData[groupIdx:groupIdx+3]))
    # if False:
    #   for i in range(len(self.waypoints)):
    #     print('Waypoint '+str(i)+'=>'+self.waypoints[i].toStr())

