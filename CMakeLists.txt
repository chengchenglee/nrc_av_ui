cmake_minimum_required(VERSION 2.8.12)
project(nrc_av_ui)

## System dependencies are found with CMake's conventions
find_package(cmake_modules REQUIRED)
find_package(nrc_msgs REQUIRED)

# we should get rid of ACE as soon as possible
# we use it for ACE_Time_Value in kn and are stuck with it 
# till we switch to Kubuntu 14.04
# Don't use any ACE headers except for TimeValue interfacing
#find_package(ACE REQUIRED)
#find_library(LOG4CXX_LIBRARY log4cxx)

## Find catkin macros and libraries
find_package(catkin REQUIRED COMPONENTS
  geometry_msgs
  nodelet
  nrc_msgs
  pluginlib
  roscpp
  std_msgs
  sensor_msgs
  tf
  visualization_msgs
)

###################################
## catkin specific configuration ##
###################################

# @TODO set dependencies and exported libraries
# this will decrease the potential for build-order problems
catkin_package(
   INCLUDE_DIRS src
   LIBRARIES
   CATKIN_DEPENDS 
#  DEPENDS system_lib
)

## Specify additional locations of header files
include_directories(
  ${catkin_INCLUDE_DIRS}
  ${PROJECT_SOURCE_DIR}/src
  ${CATKIN_DEVEL_PREFIX}/${CATKIN_GLOBAL_INCLUDE_DESTINATION}
)

#include_directories(SYSTEM "${Boost_INCLUDE_DIRS}")
#include_directories(SYSTEM "${EIGEN3_INCLUDE_DIR}")

### HACK: We rely on using parallel boost version on KUbuntu 14.04
### This is unsustainable and a major reason to move to KUbuntu 16.04
#if (DEFINED Boost_LIB_VERSION)
#if(${Boost_LIB_VERSION} STREQUAL  "1_54")
#  message("DUAL BOOST LIB HACK!!!")
#  include_directories(SYSTEM $ENV{HOME}/projects/boost_1_56_0/include/)
#endif()
#endif()

add_subdirectory( src )
