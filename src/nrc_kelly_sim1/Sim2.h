/**
 * @file    Arduino2VehicleSignalsCom.h
 * @brief   Definition of Arduino2VehicleSignalsCom class
 * @date    June 2021
 * @author  T. Cypher-Plissart
 */

#ifndef Sim2_h
#define Sim2_h

#include <ros/ros.h>
#include "nrc_msgs/CtrlStateFLG.h"
#include "nrc_msgs/ForceSteeringControl.h"
#include <diagnostic_msgs/DiagnosticArray.h>

class Sim2 {    
 
   ros::NodeHandle m_nh;                     ///< node handle
//    ros::Subscriber m_signalsSubscriber;
    ros::Publisher m_healthPublisher;
   ros::Subscriber m_ctrlStateFLGSub;
   ros::Subscriber m_ctrlInputsSub;
   
public:
  Sim2(ros::NodeHandle &nodeHandle);
  ~Sim2();
  
  int init();
  void timerCallBack(const ros::TimerEvent&);
  
  void ctrlStateFLGCallBack(const nrc_msgs::CtrlStateFLG msg);
  void ctrlInputsCallBack(const nrc_msgs::ForceSteeringControl msg);
  ros::Timer m_signalTimer;
    
};

#endif
