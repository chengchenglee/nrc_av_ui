set(MODULE_NAME sim1_node)
#set(LIB_NAME ${MODULE_NAME})

#set(SOURCES
#  Sim1.cpp
#  Sim2.cpp
#)

#set(HEADERS
#  Sim1.h
#  Sim2.h
#)

#link_directories(
#  ${catkin_LIBRARY_DIRS}
#)

#add_library(
#  ${LIB_NAME}
#  ${SOURCES}
#  ${HEADERS}
#)

add_executable(sim1 Sim1.cpp)
target_link_libraries(sim1
# ${LIB_NAME}
 ${catkin_LIBRARIES}
)

add_executable(sim2 Sim2.cpp)
target_link_libraries(sim2
# ${LIB_NAME}
 ${catkin_LIBRARIES}
)
