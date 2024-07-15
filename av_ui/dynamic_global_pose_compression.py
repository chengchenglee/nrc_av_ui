# message_converters.py

class DynamicPoseConverter:
    def convert(self, data, compress):
        if not compress:
            return self.full_conversion(data)
        else:
            return self.compressed_conversion(data)

    def full_conversion(self, data):
        return {
            'header': {
                'seq': data.header.seq,
                'stamp': {
                    'secs': data.header.stamp.secs,
                    'nsecs': data.header.stamp.nsecs
                },
                'frame_id': data.header.frame_id
            },
            'status': data.status,
            'status_message': data.status_message,
            'pose': {
                'position': {
                    'x': data.pose.position.x,
                    'y': data.pose.position.y,
                    'z': data.pose.position.z
                },
                'orientation': {
                    'x': data.pose.orientation.x,
                    'y': data.pose.orientation.y,
                    'z': data.pose.orientation.z,
                    'w': data.pose.orientation.w
                }
            },
            'twist': {
                'linear': {
                    'x': data.twist.linear.x,
                    'y': data.twist.linear.y,
                    'z': data.twist.linear.z
                },
                'angular': {
                    'x': data.twist.angular.x,
                    'y': data.twist.angular.y,
                    'z': data.twist.angular.z
                }
            },
            'accel': {
                'linear': {
                    'x': data.accel.linear.x,
                    'y': data.accel.linear.y,
                    'z': data.accel.linear.z
                },
                'angular': {
                    'x': data.accel.angular.x,
                    'y': data.accel.angular.y,
                    'z': data.accel.angular.z
                }
            },
            'sideslip': data.sideslip,
            'curvature': data.curvature,
            'covariance': list(data.covariance),
            'covariance_mode': data.covariance_mode
        }

    def compressed_conversion(self, data):
        return {
            'header': {
                'seq': data.header.seq,
                'stamp': {
                    'secs': data.header.stamp.secs,
                    'nsecs': data.header.stamp.nsecs
                },
                'frame_id': data.header.frame_id
            },
            'status': data.status,
            'status_message': data.status_message,
            'pose': {
                'position': {
                    'x': data.pose.position.x,
                    'y': data.pose.position.y,
                    'z': data.pose.position.z
                }
            }
        }