package processor

type ProcessingError struct {
	Code      string
	What      string
	Why       string
	NowWhat   string
	Severity  string
	Retryable bool
	Err       error
}

func (e ProcessingError) Error() string {
	if e.Err == nil {
		return e.What
	}
	return e.What + ": " + e.Err.Error()
}

func (e ProcessingError) Unwrap() error {
	return e.Err
}
