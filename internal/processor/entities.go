package processor

import (
	"context"
	"encoding/json"
	"path/filepath"
	"runtime"
	"sort"
)

type entityPayload struct {
	Entities []Entity `json:"entities"`
	People   []string `json:"people"`
	Dates    []string `json:"dates"`
}

func (p ExternalProcessor) detectEntities(ctx context.Context, text string) ([]Entity, []string, []string, []string) {
	if text == "" {
		return []Entity{}, []string{}, []string{}, nil
	}

	scriptPath := p.cfg.SpacyScript
	if scriptPath == "" {
		scriptPath = spacyScriptPath()
	}
	result, err := p.runner.RunWithInput(ctx, text, "python3", scriptPath, "--model", p.cfg.SpacyModel)
	if err != nil {
		return []Entity{}, []string{}, []string{}, []string{err.Error()}
	}

	var payload entityPayload
	if err := json.Unmarshal([]byte(result.Stdout), &payload); err != nil {
		return []Entity{}, []string{}, []string{}, []string{err.Error()}
	}

	sort.SliceStable(payload.Entities, func(i, j int) bool {
		return payload.Entities[i].Start < payload.Entities[j].Start
	})
	payload.Entities = assignEntityConfidence(payload.Entities, NewConfidence(0.78))
	sort.Strings(payload.People)
	sort.Strings(payload.Dates)

	return payload.Entities, payload.People, payload.Dates, nil
}

func spacyScriptPath() string {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		return "scripts/spacy_entities.py"
	}

	return filepath.Clean(filepath.Join(filepath.Dir(file), "..", "..", "scripts", "spacy_entities.py"))
}
