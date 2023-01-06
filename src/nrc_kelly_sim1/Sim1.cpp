/**
 * @file    Sim1.cpp
 */
#include "Sim1.h"

Sim1::Sim1(ros::NodeHandle &nodeHandle):
m_nh(nodeHandle),
m_x(-1.0),
m_y(0.0)
{
  // Initialize ctrl signal
  m_vCtrl.first = 0.0;
  m_vCtrl.second = 0.0;
  
  // Advertise publishers
  m_healthPublisher= m_nh.advertise<diagnostic_msgs::DiagnosticArray> ("trigger_health", 1, false);
  m_ctrlStatePub = m_nh.advertise<nrc_msgs::CtrlStateFLG> ("/CtrlStateFLG", 1, false);
  m_posePub = m_nh.advertise<nrc_msgs::DynamicPoseWithCovar> ("/dynamic_global_pose", 1, false);

  // Subscribers
  m_ctrlInputsSub = m_nh.subscribe("/control_inputs", 1, &Sim1::ctrlInputsCallBack, this);
  m_signalTimer = m_nh.createTimer(ros::Duration(0.1), &Sim1::timerCallBack, this); 
  m_signalTimer.start();
}

Sim1::~Sim1(){
}

void Sim1::timerCallBack(const ros::TimerEvent&) {
  // Publish pose info
  nrc_msgs::DynamicPoseWithCovar poseMsg;
  poseMsg.header.stamp = ros::Time::now();
  poseMsg.header.frame_id = "site";
  poseMsg.pose.position.x = m_x;
  poseMsg.pose.position.y = m_y;
  m_posePub.publish(poseMsg);
}

void Sim1::ctrlInputsCallBack(const nrc_msgs::ForceSteeringControl msg) {
  m_vCtrl.first = ros::Time::now().toSec();
  m_vCtrl.second = msg.accelerometer;
}

int main(int argc, char **argv){
  ros::init(argc, argv, "sim1");
  ros::NodeHandle nh("~");
  
  Sim1 sim1(nh);
  
  ros::spin();
  
  return 0;
}

