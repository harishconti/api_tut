from google.cloud.sql.connector import Connector
import pymysql
import pandas as pd
from .constants import *
import sys
import json
import os # Added os import

# we are encoding all to utf-8
if sys.stdout.encoding != 'UTF-8':
    sys.stdout.reconfigure(encoding='UTF-8')

# object for cloud-sql connection
connector = None
if not os.environ.get("PYTEST_RUNNING"):
    try:
        connector = Connector()
    except Exception as e:
        print(f"Warning: Failed to initialize Google Cloud SQL Connector during normal run: {e}")
        pass # Allow application to continue if connector is optional or handled later


# Function to get a database connection
def getconn() -> pymysql.connections.Connection | None: # Allow None return for tests
    if not connector:
        if os.environ.get("PYTEST_RUNNING"):
            # In test environment, we don't want a real connection.
            # The functions using getconn() should be mocked or handle None.
            print("PYTEST_RUNNING is set: Skipping real DB connection in getconn().")
            return None
        else:
            # If not in pytest and connector is None, it means initialization failed.
            print("Error: DB Connector not initialized and not in PYTEST_RUNNING mode.")
            # Depending on application logic, might raise an error here.
            return None # Or raise ConnectionError("DB Connector not available")

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