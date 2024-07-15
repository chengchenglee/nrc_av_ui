import rospy
import paho.mqtt.client as mqtt
import json
import ssl
from nrc_msgs.msg import DynamicPoseWithCovar
from geometry_msgs.msg import Point, Quaternion, Vector3
from std_msgs.msg import Header

class MQTTtoROSBridge:
    def __init__(self, mqtt_topic, ros_topic, mqtt_host, mqtt_port, mqtt_user, mqtt_password):
        self.mqtt_topic = mqtt_topic
        self.ros_topic = ros_topic
        self.mqtt_host = mqtt_host
        self.mqtt_port = mqtt_port
        self.mqtt_user = mqtt_user
        self.mqtt_password = mqtt_password

        # Initialize ROS node
        rospy.init_node('mqtt_to_ros_bridge', anonymous=True)
        
        # Initialize ROS publisher
        self.ros_publisher = rospy.Publisher(self.ros_topic, DynamicPoseWithCovar, queue_size=10)

        # Initialize MQTT client
        self.mqtt_client = mqtt.Client()
        self.mqtt_client.username_pw_set(self.mqtt_user, self.mqtt_password)
        self.mqtt_client.tls_set(cert_reqs=ssl.CERT_REQUIRED, tls_version=ssl.PROTOCOL_TLSv1_2)
        
        # Set MQTT callbacks
        self.mqtt_client.on_connect = self.on_connect
        self.mqtt_client.on_message = self.on_message
        self.mqtt_client.on_disconnect = self.on_disconnect

    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            rospy.loginfo("Connected to MQTT Broker!")
            self.mqtt_client.subscribe(self.mqtt_topic)
        else:
            rospy.logerr(f"Failed to connect to MQTT Broker. Return code: {rc}")

    def on_disconnect(self, client, userdata, rc):
        rospy.logwarn(f"Disconnected from MQTT Broker with result code: {rc}")
        if rc != 0:
            rospy.loginfo("Attempting to reconnect...")
            try:
                client.reconnect()
            except Exception as e:
                rospy.logerr(f"Failed to reconnect: {e}")

    def on_message(self, client, userdata, msg):
        try:
            json_data = json.loads(msg.payload.decode())
            ros_msg = self.construct_ros_message(json_data)
            self.ros_publisher.publish(ros_msg)
            rospy.loginfo("Published ROS message")
        except Exception as e:
            rospy.logerr(f"Error processing MQTT message: {e}")

    def construct_ros_message(self, data):
        msg = DynamicPoseWithCovar()

        # Construct Header
        msg.header = Header(
            seq=data['header']['seq'],
            stamp=rospy.Time(secs=data['header']['stamp']['secs'], nsecs=data['header']['stamp']['nsecs']),
            frame_id=data['header']['frame_id']
        )

        # Set status and status_message
        msg.status = data['status']
        msg.status_message = data['status_message']

        # Construct Pose
        msg.pose.position = Point(**data['pose']['position'])
        msg.pose.orientation = Quaternion(**data['pose']['orientation'])

        # Construct Twist
        msg.twist.linear = Vector3(**data['twist']['linear'])
        msg.twist.angular = Vector3(**data['twist']['angular'])

        # Construct Accel
        msg.accel.linear = Vector3(**data['accel']['linear'])
        msg.accel.angular = Vector3(**data['accel']['angular'])

        # Set sideslip and curvature
        msg.sideslip = data['sideslip']
        msg.curvature = data['curvature']

        # Set covariance
        msg.covariance = data['covariance']

        # Set covariance_mode
        msg.covariance_mode = data['covariance_mode']

        return msg

    def run(self):
        try:
            self.mqtt_client.connect(self.mqtt_host, self.mqtt_port, keepalive=60)
            self.mqtt_client.loop_start()
            rospy.spin()
        except Exception as e:
            rospy.logerr(f"Error in MQTT to ROS bridge: {e}")
        finally:
            self.mqtt_client.loop_stop()
            self.mqtt_client.disconnect()

if __name__ == "__main__":
    bridge = MQTTtoROSBridge(
        mqtt_topic="dgp",
        ros_topic="/reconstructed_dynamic_global_pose",
        mqtt_host="mqtt-broker-ncal.nrcsv.com",
        mqtt_port=8883,
        mqtt_user="sam-teleop",
        mqtt_password="yg#eo5cbAksD82qt"
    )
    bridge.run()