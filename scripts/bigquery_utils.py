import os
from google.cloud import bigquery
import pandas as pd

def get_bq_client():
    return bigquery.Client.from_service_account_json(
        os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    )

def get_data(period_start, period_end):
    client = get_bq_client()
    query = f"""
        SELECT
            DATE(data_inicio) AS data,
            account_name AS cliente,
            total_clicks,
            ctr_percent,
            total_spend,
            total_purchases,
            roas
        FROM `{os.getenv('PROJECT_ID')}.{os.getenv('DATASET_ID')}.{os.getenv('SOURCE_TABLE')}`
        WHERE data_inicio BETWEEN '{period_start}' AND '{period_end}'
    """
    return client.query(query).to_dataframe()


def save_insights_to_bq(df):
    client = get_bq_client()
    table_id = f"{os.getenv('PROJECT_ID')}.{os.getenv('DATASET_ID')}.{os.getenv('TARGET_TABLE')}"
    job = client.load_table_from_dataframe(
        df,
        table_id,
        job_config=bigquery.LoadJobConfig(write_disposition="WRITE_APPEND"),
    )
    job.result()
    print("Insights gravados no BigQuery!")
