#!/usr/bin/env python3
import argparse
import json
import sys


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="en_core_web_sm")
    args = parser.parse_args()

    text = sys.stdin.read()
    payload = {"entities": [], "people": [], "dates": []}
    if not text.strip():
        print(json.dumps(payload))
        return 0

    import spacy

    nlp = spacy.load(args.model)
    doc = nlp(text)
    people = set()
    dates = set()

    for ent in doc.ents:
        payload["entities"].append(
            {
                "text": ent.text,
                "label": ent.label_,
                "start": int(ent.start_char),
                "end": int(ent.end_char),
            }
        )
        if ent.label_ == "PERSON":
            people.add(ent.text)
        if ent.label_ == "DATE":
            dates.add(ent.text)

    payload["people"] = sorted(people)
    payload["dates"] = sorted(dates)
    print(json.dumps(payload, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

