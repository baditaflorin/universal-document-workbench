package processor

import "math"

func NewConfidence(score float64) Confidence {
	score = math.Max(0, math.Min(1, score))
	label := "low"
	if score >= 0.8 {
		label = "high"
	} else if score >= 0.5 {
		label = "medium"
	}

	return Confidence{Score: score, Label: label}
}
