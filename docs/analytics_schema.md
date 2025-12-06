# JSON Analytics Schema for ClickHouse/BigQuery

## Формат записи (JSONL)

Каждая строка в `logs/pages_analytics.log` — это один JSON объект:

```json
{
  "vin": "1HGCM82633A123456",
  "stage": "stage1",
  "severity": "MAJOR",
  "fatal_count": 0,
  "major_count": 1,
  "minor_count": 0,
  "wordcount": 2875,
  "rules_fired": ["syntax_incomplete_sentence_common","structure_block_min_length_core"],
  "weak_blocks": ["hero","buyer_guide"],
  "ts": "2025-12-04T10:15:32.123Z"
}
```

## ClickHouse Schema

```sql
CREATE TABLE pages_analytics (
    vin String,
    stage String,
    severity String,
    fatal_count UInt8,
    major_count UInt8,
    minor_count UInt8,
    wordcount UInt32,
    rules_fired Array(String),
    weak_blocks Array(String),
    ts DateTime
) ENGINE = MergeTree()
ORDER BY (stage, ts);
```

## BigQuery Schema

```sql
CREATE TABLE `project.dataset.pages_analytics` (
    vin STRING,
    stage STRING,
    severity STRING,
    fatal_count INT64,
    major_count INT64,
    minor_count INT64,
    wordcount INT64,
    rules_fired ARRAY<STRING>,
    weak_blocks ARRAY<STRING>,
    ts TIMESTAMP
);
```

## Загрузка данных

### ClickHouse
```bash
cat logs/pages_analytics.log | clickhouse-client --query "INSERT INTO pages_analytics FORMAT JSONEachRow"
```

### BigQuery
```bash
bq load --source_format=NEWLINE_DELIMITED_JSON \
  --autodetect \
  project:dataset.pages_analytics \
  logs/pages_analytics.log
```

## Примеры запросов

### Топ правил по частоте срабатывания
```sql
SELECT 
    rule_id,
    COUNT(*) as count
FROM pages_analytics
ARRAY JOIN rules_fired as rule_id
GROUP BY rule_id
ORDER BY count DESC
LIMIT 10;
```

### Распределение severity по стадиям
```sql
SELECT 
    stage,
    severity,
    COUNT(*) as count
FROM pages_analytics
GROUP BY stage, severity
ORDER BY stage, severity;
```

### Топ слабых блоков
```sql
SELECT 
    block_name,
    COUNT(*) as count
FROM pages_analytics
ARRAY JOIN weak_blocks as block_name
GROUP BY block_name
ORDER BY count DESC;
```
