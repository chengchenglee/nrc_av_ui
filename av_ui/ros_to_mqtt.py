import rospy
import paho.mqtt.client as mqtt
import json
import threading
import ssl
from nrc_msgs.msg import DynamicPoseWithCovar
import yaml
from compressed_dgp import *
class ROStoMQTTConverter:
    def __init__(self, config_file, broker_file,broker_name):
        with open(config_file, 'r') as file:
            config = yaml.safe_load(file)
        
        with open(broker_file, 'r') as file:
            broker_config = yaml.safe_load(file)
        
        self.ros_topic = config['ros']['topic']
        self.ros_topic_type = globals()[config['ros']['topic_type']]
        self.mqtt_topic = config['mqtt']['topic']
        self.mqtt_rate = config['mqtt']['rate']
        self.compress_flag = config['compress']
        
        broker_config = broker_config['Brokers'][broker_name]
        self.mqtt_host = broker_config['MQTT_SERVER']
        self.mqtt_port = broker_config['MQTT_PORT']
        self.mqtt_user = broker_config['MQTT_USER']
        self.mqtt_password = broker_config['MQTT_PASSWORD']
        
        rospy.init_node('ros_to_mqtt_converter', anonymous=True)
        self.mqtt_client = mqtt.Client()
        self.mqtt_client.username_pw_set(self.mqtt_user, self.mqtt_password)
        self.mqtt_client.tls_set(cert_reqs=ssl.CERT_REQUIRED, tls_version=ssl.PROTOCOL_TLSv1_2)
        self.mqtt_client.on_connect = self.on_connect
        self.mqtt_client.on_disconnect = self.on_disconnect
        self.mqtt_client.on_publish = self.on_publish

        try:
            self.mqtt_client.connect(self.mqtt_host, self.mqtt_port, keepalive=60)
            self.mqtt_client.loop_start()
        except Exception as e:
            rospy.logerr(f"Failed to connect to MQTT broker: {e}")
        
        self.ros_subscriber = rospy.Subscriber(self.ros_topic, self.ros_topic_type, self.ros_callback)
        
        self.message_buffer = []
        self.buffer_lock = threading.Lock()

        self.mqtt_thread = threading.Thread(target=self.publish_to_mqtt)
        self.mqtt_thread.daemon = True
        self.mqtt_thread.start()
    
    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            rospy.loginfo("Connected to MQTT Broker!")
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

    def on_publish(self, client, userdata, mid):
        rospy.logdebug(f"Message {mid} published successfully")

    def ros_callback(self, data):
        with self.buffer_lock:
            message_dict = compress_dynamicposewithcovar(data) if self.compress_flag else full_dynamicposewithcovar(data)
            self.message_buffer.append(message_dict)

    def publish_to_mqtt(self):
        rate = rospy.Rate(self.mqtt_rate)
        while not rospy.is_shutdown():
            with self.buffer_lock:
                if self.message_buffer:
                    message = self.message_buffer.pop(0)
                    json_message = json.dumps(message)
                    try:
                        result = self.mqtt_client.publish(self.mqtt_topic, json_message, qos=1)
                        if result.rc == mqtt.MQTT_ERR_SUCCESS:
                            rospy.loginfo(f"Published message to {self.mqtt_topic}")
                        else:
                            rospy.logerr(f"Failed to publish message. Error code: {result.rc}")
                    except Exception as e:
                        rospy.logerr(f"Error publishing message: {e}")
            rate.sleep()
    
    def run(self):
        rospy.spin()

if __name__ == "__main__":
    converter = ROStoMQTTConverter(
        '../config/ros_to_mqtt_config.yaml',
        '../config/mqtt_connection_config.yaml',
        'local'

    )
    converter.run()