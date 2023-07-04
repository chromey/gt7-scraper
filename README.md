# GT7 Scraper

## First-time setup

- Install the most recent version of [NodeJS](https://nodejs.org/)
- Open a terminal / command prompt in the project directory
- Run the command `npm install` to install dependencies

## Usage

Open a terminal / command prompt in the project directory, then execute

```bash
node . --event <event-number> [--outputFile <output-file>]
```

where `<event-number>` can be found in the URL of the event you want to scrape, and `<output-file>` is the name of the file you want to write the results to. If you don't specify an output file, the results will be written to `event_<event-number>.xlsx`

For example, if you want to scrape the RBR Valkyrie event from https://www.gran-turismo.com/gb/gt7/sportmode/event/6696/ to the default output file, you would run:

```bash
node . --event 6696
```

which gives you `event_6696.xlsx` in the project directory. The export will take around ~10 minutes due to API rate limiting. The script will inform about the progress.
