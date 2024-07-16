import rospy
def compress_dynamicposewithcovar(data):
    return {
    'header': data.header,
    'status': data.status,
    'status_message': data.status_message,
    'pose': data.pose,
    }

def full_dynamicposewithcovar(data):
    return {
    'header': data.header,
    'status': data.status,
    'status_message': data.status_message,
    'pose': data.pose,
    }
