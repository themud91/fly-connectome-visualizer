# Defi : generer data/neurons.json (T4 + T5, cote droit) a partir des CSV bruts de FlyWire/Codex
# LIMPIEZA
# https://pandas.pydata.org/docs/reference/api/pandas.read_csv.html

import json
import pandas as pd

# chemins des fichiers sources et de sortie
cheminBrut = "data/raw"
cheminSortie = "public/data/neurons.json"

sousClasses = ["t4_neuron", "t5_neuron"]
lado = "right"

# classification.csv : filtre pour ne garder que les sous-ensembles choisis (T4 + T5, cote droit)
classification = pd.read_csv(f"{cheminBrut}/classification.csv")
classificationFiltree = classification[
    (classification["sub_class"].isin(sousClasses)) & (classification["side"] == lado)
]
idsRetenus = set(classificationFiltree["root_id"])
print(f"neurones retenus ({sousClasses}, {lado}) : {len(idsRetenus)}")

# coordinates.csv.gz : position = "[x y z]" (chaine avec espaces, pas de virgules)
# une neurone a plusieurs points de coordonnees -> on prend le centroide (moyenne)
coordonnees = pd.read_csv(f"{cheminBrut}/coordinates.csv.gz")
coordonnees = coordonnees[coordonnees["root_id"].isin(idsRetenus)]


def parsePosition(chaine):
    # https://docs.python.org/3/library/stdtypes.html#str.split
    # .split : coupe la chaine "[x y z]" en 3 nombres
    valeurs = chaine.strip("[]").split()
    return float(valeurs[0]), float(valeurs[1]), float(valeurs[2])


coordonnees[["x", "y", "z"]] = coordonnees["position"].apply(
    lambda p: pd.Series(parsePosition(p))
)
centroides = coordonnees.groupby("root_id")[["x", "y", "z"]].mean().reset_index()

# fusion avec le type de neurone pour construire la liste finale
neuronesDf = centroides.merge(
    classificationFiltree[["root_id", "sub_class"]], on="root_id"
)

neurones = [
    {
        "id": int(fila.root_id),
        "x": round(fila.x, 1),
        "y": round(fila.y, 1),
        "z": round(fila.z, 1),
        "tipo": fila.sub_class,
    }
    for fila in neuronesDf.itertuples()
]

# connections_princeton.csv.gz : fichier volumineux (~270 Mo decompresse)
# on lit par blocs (chunksize) pour ne garder que les connexions internes au sous-ensemble
conexiones = []
tailleBloc = 500_000
for bloc in pd.read_csv(
    f"{cheminBrut}/connections_princeton.csv.gz", chunksize=tailleBloc
):
    blocFiltre = bloc[
        bloc["pre_root_id"].isin(idsRetenus) & bloc["post_root_id"].isin(idsRetenus)
    ]
    for fila in blocFiltre.itertuples():
        conexiones.append(
            {
                "origen": int(fila.pre_root_id),
                "destino": int(fila.post_root_id),
                "peso": int(fila.syn_count),
            }
        )

print(f"conexiones internas al subconjunto : {len(conexiones)}")

# ecriture du JSON final
with open(cheminSortie, "w", encoding="utf-8") as archivo:
    json.dump({"neuronas": neurones, "conexiones": conexiones}, archivo)

print(f"fichier genere : {cheminSortie}")
