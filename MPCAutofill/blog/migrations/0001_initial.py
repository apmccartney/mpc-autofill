# Generated by Django 3.2.5 on 2021-10-03 11:56

import datetime

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("cardpicker", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Blog",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name", models.CharField(max_length=20, unique=True)),
                ("url", models.CharField(max_length=10, unique=True)),
            ],
        ),
        migrations.CreateModel(
            name="BlogPost",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name", models.CharField(max_length=40)),
                ("date_created", models.DateTimeField(default=datetime.datetime.now)),
                ("synopsis", models.TextField(max_length=140)),
                ("contents", models.TextField()),
                (
                    "blog",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, to="blog.blog"
                    ),
                ),
            ],
            options={
                "ordering": ["-date_created"],
            },
        ),
        migrations.CreateModel(
            name="ShowcaseBlogPost",
            fields=[
                (
                    "blogpost_ptr",
                    models.OneToOneField(
                        auto_created=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        parent_link=True,
                        primary_key=True,
                        serialize=False,
                        to="blog.blogpost",
                    ),
                ),
                ("card_ids", models.CharField(blank=True, max_length=800)),
                ("cards", models.ManyToManyField(blank=True, to="cardpicker.Card")),
            ],
            bases=("blog.blogpost",),
        ),
    ]
