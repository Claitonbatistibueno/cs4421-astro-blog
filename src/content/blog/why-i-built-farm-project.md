---
title: 'Why I built Farm Project'
description: 'Small Irish beef farms make decisions with averages. Farm Project tracks each animal instead.'
pubDate: '2026-09-29'
author: 'claiton'
---

Ireland has around 135,000 active farms, and most of them are small family farms of 32 to 35 hectares. Dairy does well. Beef is a different story: margins are low, and on many beef and sheep farms the CAP payments are bigger than the net income from the farm itself.

When feed, fertiliser and energy prices go up, the farmer needs to know which animals pay for themselves and which ones do not. Most farm software does not answer that question for a small farm. It was built for big dairy or tillage operations, it is expensive, and it works with herd averages. An average hides the animal that is eating well and not gaining weight.

## What Farm Project does

Farm Project follows each animal from arrival to sale:

- **Animals and lots:** tag, breed, origin, status and the lot it belongs to.
- **Weighing:** every weighing calculates the average daily gain and the days left to reach market weight (550 kg).
- **Feeding:** cost per feed type and per lot, based on kilograms and price per kilogram.
- **Health:** treatments, medicines and withdrawal periods. An animal still inside a withdrawal period is shown as blocked.
- **Finance:** sales, bills and operational costs in one ledger, so the balance is clear.

The original system is a PHP and MySQL application with a Python assistant for health checks. On this site you can see the [dashboard](/dashboard) and the [reports](/reports) built from the same database.

## Why it is also a DevOps project

For CS4421 I used Farm Project as the product that goes through the whole delivery pipeline: Scrum board, pull requests, automated tests, infrastructure as code, a static site on S3 and CloudFront, and a container on Amazon ECS. The farm problem gives the pipeline a real reason to exist.
