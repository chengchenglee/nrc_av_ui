/**
 * @file    Arduino2VehicleSignalsCom.h
 * @brief   Definition of Arduino2VehicleSignalsCom class
 * @date    June 2021
 * @author  T. Cypher-Plissart
 */

#ifndef Sim1_h
#define Sim1_h

#include <ros/ros.h>
#include "nrc_msgs/CtrlStateFLG.h"
#include "nrc_msgs/ForceSteeringControl.h"
#include "nrc_msgs/DynamicPoseWithCovar.h"
#include <diagnostic_msgs/DiagnosticArray.h>

class Sim1 {    
 
   ros::NodeHandle m_nh;
   ros::Publisher m_healthPublisher;
   ros::Publisher m_ctrlStatePub;
   ros::Publisher m_posePub;
    
   ros::Subscriber m_ctrlInputsSub;
   
public:
  Sim1(ros::NodeHandle &nodeHandle);
  ~Sim1();
  
//  int init();
  void timerCallBack(const ros::TimerEvent&);
  
  void ctrlInputsCallBack(const nrc_msgs::ForceSteeringControl msg);
  void ctrlStateFLGCallBack(const nrc_msgs::CtrlStateFLG msg);
  ros::Timer m_signalTimer;
  
  double m_x, m_y;
  std::pair<double,double> m_vCtrl;
    
};

#endif
