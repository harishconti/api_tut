from google.cloud.sql.connector import Connector
import mysql.connector
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
def getconn() -> mysql.connector.MySQLConnection:
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
            cursor = mydb.cursor()
            cursor.execute(query, values)
            columns = [desc[0] for desc in cursor.description]  # Get column names
            data = cursor.fetchall()

        # Convert to DataFrame
        df = pd.DataFrame(data, columns=columns)
        return data
    except mysql.connector.Error as err:
        print(f"Error: {err}")
        return None


# query = "select * From applications"
# data = query_df(query)
# print(data)
