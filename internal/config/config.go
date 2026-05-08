package config

import (
	"strings"
	"time"

	"github.com/kelseyhightower/envconfig"
	"github.com/spf13/viper"
)

type Config struct {
	Env            string        `envconfig:"ENV"`
	Addr           string        `envconfig:"ADDR"`
	PublicOrigin   string        `envconfig:"PUBLIC_ORIGIN"`
	MaxUploadBytes int64         `envconfig:"MAX_UPLOAD_BYTES"`
	WorkDir        string        `envconfig:"WORK_DIR"`
	TikaJar        string        `envconfig:"TIKA_JAR"`
	TesseractLang  string        `envconfig:"TESSERACT_LANG"`
	SpacyModel     string        `envconfig:"SPACY_MODEL"`
	SpacyScript    string        `envconfig:"SPACY_SCRIPT"`
	PandocPath     string        `envconfig:"PANDOC_PATH"`
	ProcessorMode  string        `envconfig:"PROCESSOR_MODE"`
	RequestTimeout time.Duration `envconfig:"REQUEST_TIMEOUT"`
	ToolTimeout    time.Duration `envconfig:"TOOL_TIMEOUT"`
}

func Load() (Config, error) {
	viper.SetEnvPrefix("APP")
	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	viper.AutomaticEnv()

	setDefaults()

	cfg := Config{
		Env:            viper.GetString("env"),
		Addr:           viper.GetString("addr"),
		PublicOrigin:   viper.GetString("public_origin"),
		MaxUploadBytes: viper.GetInt64("max_upload_bytes"),
		WorkDir:        viper.GetString("work_dir"),
		TikaJar:        viper.GetString("tika_jar"),
		TesseractLang:  viper.GetString("tesseract_lang"),
		SpacyModel:     viper.GetString("spacy_model"),
		SpacyScript:    viper.GetString("spacy_script"),
		PandocPath:     viper.GetString("pandoc_path"),
		ProcessorMode:  viper.GetString("processor_mode"),
		RequestTimeout: viper.GetDuration("request_timeout"),
		ToolTimeout:    viper.GetDuration("tool_timeout"),
	}

	if err := envconfig.Process("APP", &cfg); err != nil {
		return Config{}, err
	}

	return cfg, nil
}

func setDefaults() {
	viper.SetDefault("env", "development")
	viper.SetDefault("addr", ":8080")
	viper.SetDefault("public_origin", "http://localhost:5173,https://baditaflorin.github.io")
	viper.SetDefault("max_upload_bytes", int64(50*1024*1024))
	viper.SetDefault("work_dir", "/tmp/universal-document-workbench")
	viper.SetDefault("tika_jar", "/opt/tika/tika-app.jar")
	viper.SetDefault("tesseract_lang", "eng")
	viper.SetDefault("spacy_model", "en_core_web_sm")
	viper.SetDefault("spacy_script", "scripts/spacy_entities.py")
	viper.SetDefault("pandoc_path", "pandoc")
	viper.SetDefault("processor_mode", "external")
	viper.SetDefault("request_timeout", 120*time.Second)
	viper.SetDefault("tool_timeout", 90*time.Second)
}

func (c Config) AllowedOrigins() []string {
	parts := strings.Split(c.PublicOrigin, ",")
	origins := make([]string, 0, len(parts))
	for _, part := range parts {
		origin := strings.TrimSpace(part)
		if origin != "" {
			origins = append(origins, origin)
		}
	}
	return origins
}
