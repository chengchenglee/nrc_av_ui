#!/bin/bash

# Grab the map_name or set a default ...
if [ $# -gt 0 ]; then
 map_name=$1
 #echo using map_name $map_name
 # To see the map names we recognize, look below ...
 #
 # TODO: a much better way to populate a menu is to add a feature to the metric map manager
 # to query the correct ROS params and map options - after all, the Manager KNOWS what it is looking for
 #
else
 map_name=Sanborn2019MMv24
 #map_name=MiniMap
 #echo using default map name $map_name
fi


SanbornSantaClara() {
    echo "using map_name $map_name"
    rosparam set /map_name $map_name
    rosparam set SANBORN_CREATE_ANNOTATION_FILE 0
    rosparam set USE_FASTER_FORMAT true
    rosparam set SANBORN_VERBOSE_ERROR_CHECKING 0
    rosparam set /siteFrame/originLat 37.397186956864289
    rosparam set /siteFrame/originLon -122.04398000000006
    rosparam set /siteFrame/originY 0.0
    rosparam set /siteFrame/originX 0.0
    rosparam set /siteFrame/originTheta 0
    rosparam set xcoordOffset -1.45
    rosparam set ycoordOffset 0.35
    rosparam set SANBORN_SLHACK_DX 0
    rosparam set SANBORN_SLHACK_DY 0
    rosparam set USE_FASTER_FORMAT true
}

MiniMap() {
    echo $(rosparam set /map_name $map_name)
    echo "Setting up params for Mini Map."
    echo $(rosparam set SANBORN_CREATE_ANNOTATION_FILE 0)
    echo $(rosparam set SANBORN_VERBOSE_ERROR_CHECKING 0)
    rosparam set USE_FASTER_FORMAT false
    rosparam set /siteFrame/originLat 37.397186956864289
    rosparam set /siteFrame/originLon -122.04398000000006
    echo $(rosparam set /siteFrame/originY 0.0)
    echo $(rosparam set /siteFrame/originX 0.0)  
    echo $(rosparam set /siteFrame/originTheta 0) 
    echo $(rosparam set xcoordOffset -1.45)
    echo $(rosparam set ycoordOffset  0.35)
    echo $(rosparam set SANBORN_SLHACK_DX 0)
    echo $(rosparam set SANBORN_SLHACK_DY 0)
    rosparam set USE_FASTER_FORMAT false
}

SanbornPNH() {
    echo $(rosparam set /map_name $map_name)
    echo "Setting up params for pnh map."
    echo $(rosparam set SANBORN_CREATE_ANNOTATION_FILE 0)
    echo $(rosparam set SANBORN_VERBOSE_ERROR_CHECKING 0)
    echo $(rosparam set /siteFrame/originLat 52.371)
    echo $(rosparam set /siteFrame/originLon 4.668)     
    echo $(rosparam set /siteFrame/originY 0.0)
    echo $(rosparam set /siteFrame/originX 0.0)  
    echo $(rosparam set /siteFrame/originTheta 0) 
    echo $(rosparam set xcoordOffset 0.0)
    echo $(rosparam set ycoordOffset 0.0)
    echo $(rosparam set SANBORN_SLHACK_DX 0)
    echo $(rosparam set SANBORN_SLHACK_DY 0)
    rosparam set USE_FASTER_FORMAT false
}


# these two probably not useful.
SantaUshr() {
    echo $(rosparam set /map_name "U,37.376947,-121.989860,3500")
    echo $(rosparam set /siteFrame/originLat 37.376947)
    echo $(rosparam set /siteFrame/originLon -121.989860)
    rosparam set USE_FASTER_FORMAT false
}
SunnyUshr() {
    rosparam set /map_name "U,37.397186956864289,-122.04398000000006,3500"
    rosparam set /siteFrame/originLat 37.397186956864289
    rosparam set /siteFrame/originLon -122.04398000000006
    rosparam set map_verbosityLevel 0
    rosparam set USE_FASTER_FORMAT false
}
HereMap() {
    echo "WARNING: HereMap is DEPRECATED"
    # yeah, this name is not something we want in our external interfaces
    echo $(rosparam set /map_name "HereLiveMap/HDMapCache(NRC-SV).db")
    roslaunch maav_svcs map_service_parameter.launch &
    echo $(rosparam set /siteFrame/originLat 37.397186956864289)
    echo $(rosparam set /siteFrame/originLon -122.04398000000006)     
    echo $(rosparam set /siteFrame/originY 0.0)
    echo $(rosparam set /siteFrame/originX -2.0)
    echo $(rosparam set /siteFrame/originTheta 0)
    rosparam set USE_FASTER_FORMAT false
}

ThunderHill() {
    # With learned data
    echo $(rosparam set /map_name "THill_Cached")
    echo $(rosparam set CREATE_ANNOTATION_FILE 0)     
    echo $(rosparam set /siteFrame/originLat 37.397186956864289)
    echo $(rosparam set /siteFrame/originLon -122.04398000000006)  
    echo $(rosparam set /map_verbosityLevel 0)     
    echo $(rosparam set NO_SAVE 1)
    rosparam set USE_FASTER_FORMAT false
}

LearnMapSantaClara() {

    # common data
    echo $(rosparam set /siteFrame/originLat 37.397186956864289)
    echo $(rosparam set /siteFrame/originLon -122.04398000000006)  
    echo $(rosparam set NO_SAVE 1)

    # With learned data
    #echo $(rosparam set /map_name "SC_Cached")
    #echo $(rosparam set CREATE_ANNOTATION_FILE 0)     
    #echo $(rosparam set /map_verbosityLevel 0)
    
    # Without learned data
    #echo $(rosparam set /map_name "SC.set")
    #echo $(rosparam set CREATE_ANNOTATION_FILE 1)
    #echo $(rosparam set /map_verbosityLevel 10)     
    rosparam set USE_FASTER_FORMAT false
}

LearnMapSanMiguel() {

    # common data
    echo $(rosparam set /siteFrame/originLat 37.397186956864289)
    echo $(rosparam set /siteFrame/originLon -122.04398000000006)  
    echo $(rosparam set NO_SAVE 1)

    # With learned data
    echo $(rosparam set /map_name "SanMiguel_Cached")
    echo $(rosparam set CREATE_ANNOTATION_FILE 0)     
    echo $(rosparam set /map_verbosityLevel 0)
    
    # Without learned data
    #echo $(rosparam set /map_name "SanMiguel.set")
    #echo $(rosparam set CREATE_ANNOTATION_FILE 1)     
    #echo $(rosparam set /map_verbosityLevel 10)     
    rosparam set USE_FASTER_FORMAT false
}
        

LearnMapSF() {

    # Common data
    echo $(rosparam set /siteFrame/originLat 37.397186956864289)
    echo $(rosparam set /siteFrame/originLon -122.04398000000006)  
    echo $(rosparam set NO_SAVE 1)

    # With learned data
    #echo $(rosparam set /map_name "Noe_Cached")
    #echo $(rosparam set CREATE_ANNOTATION_FILE 0)     
    #echo $(rosparam set /map_verbosityLevel 0)     
    
    # Without learned data - mostly for debugging?
    echo $(rosparam set /map_name "Noe.set")
    echo $(rosparam set CREATE_ANNOTATION_FILE 1)     
    echo $(rosparam set /map_verbosityLevel 10)     
    rosparam set USE_FASTER_FORMAT false
}
        
LearnMapFranklin() {

    # Common data
    echo $(rosparam set /siteFrame/originLat 35.939640)
    echo $(rosparam set /siteFrame/originLon -86.813031) 
    echo $(rosparam set NO_SAVE 1)
    
    echo $(rosparam set /siteFrame/originLat 37.397186956864289)
    echo $(rosparam set /siteFrame/originLon -122.04398000000006)  
    echo $(rosparam set NO_SAVE 1)

    # With learned data
    #echo $(rosparam set /map_name "Franklin_Cached")
    #echo $(rosparam set CREATE_ANNOTATION_FILE 0)     
    #echo $(rosparam set /map_verbosityLevel 0)     
    
    # Without learned data
    echo $(rosparam set /map_name "Franklin.set")
    echo $(rosparam set CREATE_ANNOTATION_FILE 0)     
    echo $(rosparam set /map_verbosityLevel 10)     
    rosparam set USE_FASTER_FORMAT true
}
        
SetMapName() {
    # just set the passed in map name and go for it!
    echo $(rosparam set /map_name $map_name)
    rosparam set USE_FASTER_FORMAT false
}

oldmain() {
# pick one
if   [ $map_name == "Sanborn2019MMv24" ]; then SanbornSantaClara;
elif [ $map_name == "MiniMap" ];          then MiniMap;
elif [ $map_name == "LearningMap" ];      then LearnMapSantaClara;
elif [ $map_name == "SanMiguel" ];        then LearnMapSanMiguel;
elif [ $map_name == "SF" ];               then LearnMapSF;
elif [ $map_name == "Franklin" ];         then LearnMapFranklin;
elif [ $map_name == "ThunderHill" ];      then ThunderHill;
elif [ $map_name == "Sanborn2020PNHv2" ]; then SanbornPNH;
elif [ $map_name == "HereMap" ];          then HereMap;
else                                           SetMapName;
fi
}

######################################################################
# This is a bit brittle, but just be sure the av_interface names
# match these choices and make sure the /map_name set in the functions
# we call match them as well. This is the tie point.
main() {
# pick one
if   [ $map_name == "Sanborn2019MMv24" ]; then SanbornSantaClara;
elif [ $map_name == "MiniMap" ];          then MiniMap;
elif [ $map_name == "SC_Cached" ];        then LearnMapSantaClara;
elif [ $map_name == "SanMiguel_Cached" ]; then LearnMapSanMiguel;
elif [ $map_name == "Noe.set" ];          then LearnMapSF;
elif [ $map_name == "Franklin.set" ];     then LearnMapFranklin;
elif [ $map_name == "THill_Cached" ];     then ThunderHill;
elif [ $map_name == "Sanborn2020PNHv2" ]; then SanbornPNH;
else                                           SetMapName;
fi
}

main;
echo "Done setting map params."


