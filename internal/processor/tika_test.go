package processor

import "testing"

func TestParseMetadataJSON(t *testing.T) {
	t.Parallel()

	metadata := parseMetadata(`{"Content-Type":"application/pdf","Author":["Ada","Florin"]}`)

	if metadata["Content-Type"] != "application/pdf" {
		t.Fatalf("unexpected content type: %s", metadata["Content-Type"])
	}
	if metadata["Author"] != "Ada, Florin" {
		t.Fatalf("unexpected author: %s", metadata["Author"])
	}
}

func TestParseMetadataLines(t *testing.T) {
	t.Parallel()

	metadata := parseMetadata("Content-Type: text/plain\nX-Parsed-By: tika\n")

	if metadata["X-Parsed-By"] != "tika" {
		t.Fatalf("unexpected parser: %s", metadata["X-Parsed-By"])
	}
}
