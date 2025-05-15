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
    rosparam set USE_FASTER_FORMAT True
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
}

SanbornBishopRanch() {
    echo "using map_name $map_name"
    rosparam set /map_name $map_name
    rosparam set SANBORN_CREATE_ANNOTATION_FILE 0
    rosparam set USE_FASTER_FORMAT True
    rosparam set SANBORN_VERBOSE_ERROR_CHECKING 0
    rosparam set /siteFrame/originLat 38.01478
    rosparam set /siteFrame/originLon -122.00849
    rosparam set /siteFrame/originY 0.0
    rosparam set /siteFrame/originX 0.0
    rosparam set /siteFrame/originTheta 0
    rosparam set xcoordOffset -1.45
    rosparam set ycoordOffset 0.35
    rosparam set SANBORN_SLHACK_DX 0
    rosparam set SANBORN_SLHACK_DY 0

    SIMINITIALPOSE="3987.900,-27296.471,2.013"  
    rosparam set /simpulator_start_pose $SIMINITIALPOSE
}

MiniMap() {
    echo $(rosparam set /map_name $map_name)
    echo "Setting up params for Mini Map."
    echo $(rosparam set SANBORN_CREATE_ANNOTATION_FILE 0)
    echo $(rosparam set SANBORN_VERBOSE_ERROR_CHECKING 0)
    rosparam set USE_FASTER_FORMAT true
    rosparam set /siteFrame/originLat 37.397186956864289
    rosparam set /siteFrame/originLon -122.04398000000006
    echo $(rosparam set /siteFrame/originY 0.0)
    echo $(rosparam set /siteFrame/originX 0.0)  
    echo $(rosparam set /siteFrame/originTheta 0) 
    echo $(rosparam set xcoordOffset -1.45)
    echo $(rosparam set ycoordOffset  0.35)
    echo $(rosparam set SANBORN_SLHACK_DX 0)
    echo $(rosparam set SANBORN_SLHACK_DY 0)
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
    #rosparam set USE_FASTER_FORMAT false
    rosparam set USE_FASTER_FORMAT true
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
    rosparam set USE_FASTER_FORMAT true
SIMINITIALPOSE="-24324.0,237437.0,0.787"
rosparam set /simpulator_start_pose $SIMINITIALPOSE
}

LearnMapSantaClara() {

    # common data
    echo $(rosparam set /siteFrame/originLat 37.397186956864289)
    echo $(rosparam set /siteFrame/originLon -122.04398000000006)  
    echo $(rosparam set NO_SAVE 1)

    # With learned data
    echo $(rosparam set /map_name "SC_Cached")
    echo $(rosparam set CREATE_ANNOTATION_FILE 0)     
    echo $(rosparam set /map_verbosityLevel 0)
    
    # Without learned data
    #echo $(rosparam set /map_name "SC.set")
    #echo $(rosparam set CREATE_ANNOTATION_FILE 1)
    #echo $(rosparam set /map_verbosityLevel 10)     
    rosparam set USE_FASTER_FORMAT true
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
    #echo $(rosparam set /siteFrame/originLat 35.939640)
    #echo $(rosparam set /siteFrame/originLon -86.813031) 
    #echo $(rosparam set NO_SAVE 1)
    
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
    rosparam set xcoordOffset 0.0
    rosparam set ycoordOffset 0.0
    rosparam set USE_FASTER_FORMAT true

SIMINITIALPOSE="4799.,-2245.,0.0"
rosparam set /simpulator_start_pose $SIMINITIALPOSE
}

set_new_MM_map() {

    echo "Setting up params for new_MM_map."
    
    # just set the passed in map name and go for it!
    echo $(rosparam set /map_name $map_name)
    
    # TO-DOs: commented out as not seeing its effective yet.
    originLat=36.00
    originLon=139.833333
    echo $(rosparam set /siteFrame/originLat $originLat)
    echo $(rosparam set /siteFrame/originLon $originLon)
    # echo $(rosparam set NO_SAVE 0)

    # Without learned data
    useFF=false
    createAno=true
    echo $(rosparam set AISAN_MM_CREATE_ANNOTATION_FILE 0)   
    echo $(rosparam set CREATE_ANNOTATION_FILE $createAno)      
    # echo $(rosparam set /map_verbosityLevel 10)     
    
    # use faster format is bool
    echo $(rosparam set USE_FASTER_FORMAT $useFF)
    

    #echo $(rosparam get USE_FASTER_FORMAT)
    #echo $(rosparam get CREATE_ANNOTATION_FILE)
    
    echo "Setting: /siteFrame/originLat $originLat"
    echo "Setting: /siteFrame/originLon $originLon"
    echo "Setting: CREATE_ANNOTATION_FILE $createAno"
    echo "Setting: USE_FASTER_FORMAT $useFF"
    
}

set_new_UK_map() {

    echo "Setting up params for new_UK_map."
    
    # just set the passed in map name and go for it!
    echo $(rosparam set /map_name $map_name)
    
    # TO-DOs: commented out as not seeing its effective yet.
    originLat=51.501
    originLon=-0.069
    echo $(rosparam set /siteFrame/originLat $originLat)
    echo $(rosparam set /siteFrame/originLon $originLon)  
    # echo $(rosparam set NO_SAVE 0)

    # Without learned data
    useFF=false
    createAno=true
    echo $(rosparam set AISAN_MM_CREATE_ANNOTATION_FILE 0)   
    echo $(rosparam set CREATE_ANNOTATION_FILE $createAno)      
    # echo $(rosparam set /map_verbosityLevel 10)     
    
    # use faster format is bool
    echo $(rosparam set USE_FASTER_FORMAT $useFF)
    

    #echo $(rosparam get USE_FASTER_FORMAT)
    #echo $(rosparam get CREATE_ANNOTATION_FILE)
    
    echo "Setting: /siteFrame/originLat $originLat"
    echo "Setting: /siteFrame/originLon $originLon"
    echo "Setting: CREATE_ANNOTATION_FILE $createAno"
    echo "Setting: USE_FASTER_FORMAT $useFF"
}

set_new_LONDON_map() {

    echo "Setting up params for new_LONDON_map."
    
    # just set the passed in map name and go for it!
    echo $(rosparam set /map_name $map_name)
    
    # TO-DOs: commented out as not seeing its effective yet.
    originLat=51.371838681287009
    originLon=-1.3107924391239296
    echo $(rosparam set /siteFrame/originLat $originLat)
    echo $(rosparam set /siteFrame/originLon $originLon)  
    # echo $(rosparam set NO_SAVE 0)

    # Without learned data
    useFF=false
    createAno=true
    echo $(rosparam set AISAN_MM_CREATE_ANNOTATION_FILE 0)   
    echo $(rosparam set CREATE_ANNOTATION_FILE $createAno)
    echo $(rosparam set AISAN_UK_COEF_A 5.0)
    echo $(rosparam set AISAN_UK_COEF_B 8.0)
    # echo $(rosparam set /map_verbosityLevel 10)     
    
    # use faster format is bool
    echo $(rosparam set USE_FASTER_FORMAT $useFF)
    

    #echo $(rosparam get USE_FASTER_FORMAT)
    #echo $(rosparam get CREATE_ANNOTATION_FILE)
    
    echo "Setting: /siteFrame/originLat $originLat"
    echo "Setting: /siteFrame/originLon $originLon"
    echo "Setting: CREATE_ANNOTATION_FILE $createAno"
    echo "Setting: USE_FASTER_FORMAT $useFF"
}

######################################################
# a tiled map in Santa Clara
SCTile() {
echo "Setting map to SCTile."
rosparam set /siteFrame/originLat 37.397186956864289
rosparam set /siteFrame/originLon -122.04398000000006
rosparam set /map_name SCTile
rosparam set CREATE_ANNOTATION_FILE 0
rosparam set USE_FASTER_FORMAT true

# adding extra that seems to be required for tiled map
SIMINITIALPOSE="4799.,-2245.,0.0"
rosparam set /simpulator_start_pose $SIMINITIALPOSE
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
elif [ $map_name == "Sanborn2022BRv2" ];  then SanbornBishopRanch;
elif [ $map_name == "MiniMap" ];          then MiniMap;
elif [ $map_name == "SC_Cached" ];        then LearnMapSantaClara;
elif [ $map_name == "SanMiguel_Cached" ]; then LearnMapSanMiguel;
elif [ $map_name == "Noe.set" ];          then LearnMapSF;
elif [ $map_name == "Franklin.set" ];     then LearnMapFranklin;
elif [ $map_name == "THill_Cached" ];     then ThunderHill;
elif [ $map_name == "Sanborn2020PNHv2" ]; then SanbornPNH;
elif [ $map_name == "new_MM_map" ];       then set_new_MM_map;
elif [ $map_name == "new_UK_map" ];       then set_new_UK_map;
elif [ $map_name == "new_LONDON_map" ];   then set_new_LONDON_map;
elif [ $map_name == "SCTile" ];           then SCTile;
else                                      SetMapName;
fi
}

main;
echo "Done setting map params."


