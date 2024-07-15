import rospy

def compress_dynamicposewithcovar(data):
    return {
        'header': {
            'seq': data.header.seq,
        },
        'header': {
            'stamp': {
            'secs': data.header.stamp.secs,
        },
        },
        'header': {
            'stamp': {
            'nsecs': data.header.stamp.nsecs,
        },
        },
        'header': {
            'frame_id': data.header.frame_id,
        },
        'status': data.status,
        'status_message': data.status_message,
        'pose': {
            'position': {
            'x': data.pose.position.x,
        },
        },
        'pose': {
            'position': {
            'y': data.pose.position.y,
        },
        },
        'pose': {
            'position': {
            'z': data.pose.position.z,
        },
        },
        'pose': {
            'orientation': {
            'x': data.pose.orientation.x,
        },
        },
        'pose': {
            'orientation': {
            'y': data.pose.orientation.y,
        },
        },
        'pose': {
            'orientation': {
            'z': data.pose.orientation.z,
        },
        },
        'pose': {
            'orientation': {
            'w': data.pose.orientation.w,
        },
        },
    }

def full_dynamicposewithcovar(data):
    return {
        'header': {
            'seq': data.header.seq,
        },
        'header': {
            'stamp': {
            'secs': data.header.stamp.secs,
        },
        },
        'header': {
            'stamp': {
            'nsecs': data.header.stamp.nsecs,
        },
        },
        'header': {
            'frame_id': data.header.frame_id,
        },
        'status': data.status,
        'status_message': data.status_message,
        'pose': {
            'position': {
            'x': data.pose.position.x,
        },
        },
        'pose': {
            'position': {
            'y': data.pose.position.y,
        },
        },
        'pose': {
            'position': {
            'z': data.pose.position.z,
        },
        },
        'pose': {
            'orientation': {
            'x': data.pose.orientation.x,
        },
        },
        'pose': {
            'orientation': {
            'y': data.pose.orientation.y,
        },
        },
        'pose': {
            'orientation': {
            'z': data.pose.orientation.z,
        },
        },
        'pose': {
            'orientation': {
            'w': data.pose.orientation.w,
        },
        },
        'twist': {
            'linear': {
            'x': data.twist.linear.x,
        },
        },
        'twist': {
            'linear': {
            'y': data.twist.linear.y,
        },
        },
        'twist': {
            'linear': {
            'z': data.twist.linear.z,
        },
        },
        'twist': {
            'angular': {
            'x': data.twist.angular.x,
        },
        },
        'twist': {
            'angular': {
            'y': data.twist.angular.y,
        },
        },
        'twist': {
            'angular': {
            'z': data.twist.angular.z,
        },
        },
        'accel': {
            'linear': {
            'x': data.accel.linear.x,
        },
        },
        'accel': {
            'linear': {
            'y': data.accel.linear.y,
        },
        },
        'accel': {
            'linear': {
            'z': data.accel.linear.z,
        },
        },
        'accel': {
            'angular': {
            'x': data.accel.angular.x,
        },
        },
        'accel': {
            'angular': {
            'y': data.accel.angular.y,
        },
        },
        'accel': {
            'angular': {
            'z': data.accel.angular.z,
        },
        },
        'sideslip': data.sideslip,
        'curvature': data.curvature,
        'covariance': data.covariance,
        'covariance_mode': data.covariance_mode,
    }
