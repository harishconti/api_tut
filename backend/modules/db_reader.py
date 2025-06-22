from google.cloud.sql.connector import Connector
import pymysql
import pandas as pd
from .constants import *
import sys
import json

# we are encoding all to utf-8
if sys.stdout.encoding != 'UTF-8':
    sys.stdout.reconfigure(encoding='UTF-8')

# object for cloud-sql connection
connector = Connector()


# Function to get a database connection
def getconn() -> pymysql.connections.Connection:
    conn = connector.connect(
        instance_connection_name,
        "pymysql",  # Specify the MySQL dialect
        user=db_user,
        password=db_pass,
        db=db_name
    )
    return conn


def query_df(query, values=None):
    try:
        with getconn() as mydb:
            # The cursor from a pymysql connection does not have a native `description`
            # attribute in the same way, so we read directly into pandas.
            df = pd.read_sql_query(query, mydb, params=values)
            
        # To match the original function's return type, we convert the DataFrame
        # to a list of lists/tuples.
        return df.to_records(index=False).tolist()
    except Exception as err:
        print(f"Error: {err}")
        return None

# query = "select * From applications"
# data = query_df(query)
# print(data)