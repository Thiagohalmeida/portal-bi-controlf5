import os
import pandas as pd
from dotenv import load_dotenv
from datetime import date, timedelta
from bigquery_utils import get_data, save_insights_to_bq
from gpt_utils import gerar_insight

load_dotenv()

def main():
    hoje = date.today()
    inicio = hoje - timedelta(days=7)
    fim = hoje - timedelta(days=1)
    df = get_data(inicio, fim)
    
    insights = []
    for cliente in df["cliente"].unique():
        dados = df[df["cliente"] == cliente].mean(numeric_only=True).to_dict()
        insight_texto = gerar_insight(cliente, f"{inicio} a {fim}", dados)
        insights.append({
            "cliente": cliente,
            "data": fim.isoformat(),
            "insight": insight_texto
        })
    df_insights = pd.DataFrame(insights)
    save_insights_to_bq(df_insights)

if __name__ == "__main__":
    main()
