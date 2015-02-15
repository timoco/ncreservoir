#
#2345678901234567890123456789012345678901234567890123456789012345678901234567890
#        1         2         3         4         5         6         7         8
# -----------------------------------------------------------------------------
#                        NC Reservoir Siting Project
# -----------------------------------------------------------------------------
#
#                            ImpactAnalyis.py
#
# PURPOSE:
#
#
# -----------------------------------------------------------------------------
#
# DEPENDENCIES:
#
# 1).  ArcGIS Server 10.1 or higher.
#
# -----------------------------------------------------------------------------
# INPUT(S):
#
# 1).  Four parameters as follows:
#
#      0:  The session number:  The name of the directory that stores all the
#          scenarios (REQUIRED).
#
#      1:  The scenario number:  The name of the folder that contains the dam
#          scenario results (REQUIRED).
#
#      2:  The session directory:  A full path to the location of the directory
#          that stores all sessions (OPTIONAL).  The default is set to a location
#          on the server.
#
#      3:  The configuration file:  A full path to the text file that stores all
#          of the input layers to be used in the analysis (OPTIONAL).  The
#          configuration file consists of three fields per line, separated by
#          commas:  a "display name" for the input layer, a name to assign to
#          layer in the personal geodatabase, and the full path to the input
#          layer.  For example:
#
#          Cultural Sites,cultural,c:/DATA/cultural.shp
#          Roads,roads,c:/DATA/roads.shp
#          State Parks,stparks,C:/DATA/stparks.shp
# 
#
# -----------------------------------------------------------------------------
# OUTPUT(S):
#

# 1).  A raster layer called "res".  This layer is created from the "dem"
#      raster layer and is merely a recode of the "dem" layer where a value
#      of "1" indicates the interior of the reservoir.
#
# 2).  A new personal geodatabase is created inside the session directory.
#      The geodatabase is named "ia.mdb".  All further outputs are placed
#      into this geodatabase (see 3 and 4 below).
#
# 3).  A layer called "res" inside the personal geodatabase "ia.mdb".  This
#      is a vector representation (polygon) of the "res" raster layer and is
#      used to clip all input layers.
#
# 4).  There will be a layer for each input layer indicated in the configuration
#      file and each of these layers will have a "_stats" table associated with
#      it.
#
# -----------------------------------------------------------------------------
# NOTES:
#
# TODO:  There is no way to re-run the analysis without an error.  Fix that.
#
#
# -----------------------------------------------------------------------------
# INSTALLATION INSTRUCTIONS:
#
# -----------------------------------------------------------------------------
# HISTORY:
#
# (20130329-mcknight):  Initial coding.
#
# ==============================================================================
#


# Import arcpy module
import arcpy

import os
# Check out any necessary licenses
arcpy.CheckOutExtension("spatial")


# Set up the global variables...
# required
session = arcpy.GetParameterAsText(0)
# required
scenario = arcpy.GetParameterAsText(1)
# it is assumed a default will be supplied by the calling program
session_dir = arcpy.GetParameterAsText(2)
# it is assumed a default will be supplied by the calling program
config_file = arcpy.GetParameterAsText(3)



pgdbname = "ia.gdb"
#pgdbname = "ia.mdb"
scenario_path = session_dir + "/" + session + "/" + scenario



def createpgdb():
    arcpy.AddMessage("Creating output personal geodatabase...")
   
    if arcpy.Exists(scenario_path + "/" + pgdbname):
        arcpy.Delete_management(scenario_path + "/" + pgdbname)
        
    arcpy.CreateFileGDB_management(scenario_path, pgdbname, "CURRENT")
    #arcpy.CreatePersonalGDB_management(scenario_path, pgdbname, "CURRENT")

    return




#
# Recodes the DEM to a single value.  Value 1 is within the reservoir and everything
# else is NULL (i.e. outside the reservoir boundary).
#
def recode_dem():
    arcpy.AddMessage("Recoding DEM to single binary raster...")
    dem_raster = scenario_path + "/dem"
    binary_raster = scenario_path + "/res"
    arcpy.gp.SetNull_sa(dem_raster, "1", binary_raster, "\"VALUE\" = 0")
    return

#
# Create a vector layer of the reservoir area.  This will be used later to
# generate clips and summaries of other vector layers.
#
def create_boundary():
    arcpy.AddMessage("Creating vector boundary feature class from binary raster...")
    binary_raster = scenario_path + "/res"
    res_boundary = scenario_path + "/" + pgdbname + "/res"
    arcpy.RasterToPolygon_conversion(binary_raster, res_boundary, "SIMPLIFY", "VALUE")
    return

#
# Clip all the input layers.  Using the configuration file, clip each input layer with
# the reservoir boundary.
#
def clip_layers():
                     
    arcpy.AddMessage("Clipping thematic layers with reservoir boundary...")

    res_layer = scenario_path + "/" + pgdbname + "/res"
    
    f = open(config_file, "r")
    
    for line in f:
        (displayname, layername, layerpath) = line.rstrip().split(",")
        input_layer = layerpath
        clipped_layer = scenario_path + "/" + pgdbname + "/" + layername
        arcpy.Clip_analysis(input_layer, res_layer, clipped_layer, "")
        
    f.close() 

    return


#
#
#
def layer_stats():
                     
    arcpy.AddMessage("Summarizing thematic layers with reservoir boundary...")

    res_layer = scenario_path + "/" + pgdbname + "/res"
    json_string = "{\"statistics\":["
    
    f = open(config_file, "r")
    
    for line in f:
        (displayname, layername, layerpath) = line.rstrip().split(",")
        stats_layer = scenario_path + "/" + pgdbname + "/" + layername
        stats_table = scenario_path + "/" + pgdbname + "/" + layername + "_stats"
        desc = arcpy.Describe(stats_layer)
        type = desc.shapeType

        if type == "Polyline":
            arcpy.Statistics_analysis(stats_layer, stats_table, "Shape_Length SUM", "")
            cursor = arcpy.SearchCursor(stats_table)
            json_string = json_string +  "{\"layername\":\"" + displayname + "\","
            json_string = json_string + "\"stat_name\":\"Total Length\","
            for row in cursor:
                value = row.getValue("SUM_Shape_Length") 
            json_string = json_string + "\"stat_value\":" + str(value)
            json_string = json_string + "}"
            
        if type == "Point":
            arcpy.Statistics_analysis(stats_layer, stats_table, "OBJECTID COUNT", "")
            cursor = arcpy.SearchCursor(stats_table)
            json_string = json_string +  "{\"layername\":\"" + displayname + "\","
            json_string = json_string + "\"stat_name\":\"Count\","
            for row in cursor:
                value = row.getValue("FREQUENCY")
            json_string = json_string + "\"stat_value\":" + str(value)
            json_string = json_string + "}"
    
        if type == "Polygon":
            arcpy.Statistics_analysis(stats_layer, stats_table, "Shape_Area SUM", "")
            cursor = arcpy.SearchCursor(stats_table)
            json_string = json_string +  "{\"layername\":\"" + displayname + "\","
            json_string = json_string + "\"stat_name\":\"Total Area\","
            for row in cursor:
                value = row.getValue("SUM_Shape_Area") 
            json_string = json_string + "\"stat_value\":" + str(value)
            json_string = json_string + "}"
            
    json_string = json_string + "]}"
    arcpy.AddMessage(json_string)
    arcpy.SetParameterAsText(4,json_string)
    f.close() 

    return





if session != "publish":
    arcpy.AddMessage("running...")
    createpgdb()
    recode_dem()
    create_boundary()
    clip_layers()
    layer_stats()
else:
    arcpy.AddMessage("PUBLISH")


del arcpy



# Local variables:



