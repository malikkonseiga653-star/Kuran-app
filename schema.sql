create table pannes (
  id text primary key,
  categorie text not null,
  type text not null,
  description text,
  secteur text not null,
  position_lat double precision,
  position_lng double precision,
  statut text not null default 'nouveau',
  cree_le bigint not null,
  maj_le bigint not null,
  prix_min integer,
  prix_max integer,
  prix_final integer,
  commission integer
);

create table electriciens (
  id text primary key,
  nom text not null,
  prenom text not null,
  age text,
  secteur text,
  experience text,
  niveau_etudes text,
  telephone text not null unique,
  mot_de_passe text not null,
  cnib_nom_fichier text,
  statut text not null default 'en_attente',
  inscrit_le bigint not null
);

alter table pannes enable row level security;
alter table electriciens enable row level security;

create policy "lecture_pannes" on pannes for select using (true);
create policy "ecriture_pannes" on pannes for insert with check (true);
create policy "maj_pannes" on pannes for update using (true);

create policy "lecture_electriciens" on electriciens for select using (true);
create policy "ecriture_electriciens" on electriciens for insert with check (true);
create policy "maj_electriciens" on electriciens for update using (true);
