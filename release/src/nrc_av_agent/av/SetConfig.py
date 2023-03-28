import rospy

def setDemoConfig():
    rospy.set_param('useWorldModel2', False)
    rospy.set_param('trajectory_planner/enableOptimizedSpeedPlan', False)
    rospy.set_param('trajectory_planner/enableHazardBoundariesFromContourPoints', False)
    
    try:
        rospy.delete_param('interface_config/use_tracked_objects')
    except KeyError:
        pass
    
    print("\nFinished setting demo configuration.")
    
def setExpConfig():
    rospy.set_param('useWorldModel2', True)
    rospy.set_param('trajectory_planner/enableOptimizedSpeedPlan', True)
    rospy.set_param('trajectory_planner/enableHazardBoundariesFromContourPoints', True)
    rospy.set_param('interface_config/use_tracked_objects', False)
    print("\nFinished setting experimental configuration.")
    
