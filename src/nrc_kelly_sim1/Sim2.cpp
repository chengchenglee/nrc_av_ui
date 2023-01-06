/**
 * @file    Sim2.cpp
 */
#include "Sim2.h"

Sim2::Sim2(ros::NodeHandle &nodeHandle):
m_nh(nodeHandle)
{
 
  
//     m_signalsSubscriber = m_nh.subscribe("/signals_to_paradise", 1, &Sim2::signalsCallBack, this);
    m_healthPublisher= m_nh.advertise<diagnostic_msgs::DiagnosticArray> ("trigger_health", 1, false);
    
    //subscribe to engage
    m_ctrlStateFLGSub = m_nh.subscribe("/CtrlStateFLG", 1, &Sim2::ctrlStateFLGCallBack, this); 
    m_ctrlInputsSub = m_nh.subscribe("/control_inputs", 1, &Sim2::ctrlInputsCallBack, this);
    m_signalTimer = m_nh.createTimer(ros::Duration(0.1), &Sim2::timerCallBack, this); 

}

Sim2::~Sim2(){
}

void Sim2::timerCallBack(const ros::TimerEvent&) {

}
    
void Sim2::ctrlStateFLGCallBack(const nrc_msgs::CtrlStateFLG msg) {
  //m_isEngaged = msg.Engaged;
}

void Sim2::ctrlInputsCallBack(const nrc_msgs::ForceSteeringControl msg) {
  //m_isDecelerating = (msg.accelerometer < 0.);
}
 
// void run (ros::NodeHandle nh, std::shared_ptr<boost::asio::io_service> io){
// 
// };

int main(int argc, char **argv){
  ros::init(argc, argv, "sim2");
  ros::NodeHandle nh("~");
  ros::spin();
  
  return 0;
}

