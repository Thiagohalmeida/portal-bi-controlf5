import openai
import os

openai.api_key = os.getenv("OPENAI_API_KEY")

def gerar_insight(cliente, periodo_atual, dados_atuais):
    prompt = (
        f"Você é um analista de marketing digital. Analise os dados abaixo para o cliente {cliente}, "
        f"referente ao período {periodo_atual}:\n\n"
    )
    for col, val in dados_atuais.items():
        prompt += f"- {col}: {val}\n"
    prompt += "\nGere um insight prático e objetivo sobre a performance, indicando pontos fortes e melhorias."
    
    response = openai.ChatCompletion.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3
    )
    return response.choices[0].message.content.strip()
