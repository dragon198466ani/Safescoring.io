// Package safescoring provides the official Go SDK for SafeScoring API.
//
// SafeScoring provides security ratings for crypto products including
// hardware wallets, software wallets, and DeFi protocols.
//
// Example usage:
//
//	client := safescoring.NewClient("sk_live_xxx")
//	product, err := client.Products.Get("ledger-nano-x")
//	if err != nil {
//	    log.Fatal(err)
//	}
//	fmt.Printf("%s: %d/100\n", product.Name, product.Score)
package safescoring

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"time"
)

const (
	DefaultBaseURL = "https://safescoring.io"
	APIVersion     = "v1"
	UserAgent      = "safescoring-go/1.0.0"
)

// Client is the SafeScoring API client.
type Client struct {
	BaseURL    string
	APIKey     string
	HTTPClient *http.Client

	Products  *ProductsService
	Incidents *IncidentsService
	Stats     *StatsService
}

// NewClient creates a new SafeScoring API client.
func NewClient(apiKey string) *Client {
	c := &Client{
		BaseURL: DefaultBaseURL,
		APIKey:  apiKey,
		HTTPClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
	c.Products = &ProductsService{client: c}
	c.Incidents = &IncidentsService{client: c}
	c.Stats = &StatsService{client: c}
	return c
}

// Error represents an API error.
type Error struct {
	StatusCode int
	Message    string
	RetryAfter int // For rate limit errors
}

func (e *Error) Error() string {
	return fmt.Sprintf("safescoring: %s (status %d)", e.Message, e.StatusCode)
}

// IsRateLimited returns true if this is a rate limit error.
func (e *Error) IsRateLimited() bool {
	return e.StatusCode == 429
}

// IsNotFound returns true if the resource was not found.
func (e *Error) IsNotFound() bool {
	return e.StatusCode == 404
}

func (c *Client) request(method, endpoint string, params url.Values) ([]byte, error) {
	reqURL := fmt.Sprintf("%s/api/%s%s", c.BaseURL, APIVersion, endpoint)
	if params != nil && len(params) > 0 {
		reqURL += "?" + params.Encode()
	}

	req, err := http.NewRequest(method, reqURL, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", UserAgent)
	if c.APIKey != "" {
		req.Header.Set("X-API-Key", c.APIKey)
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode >= 400 {
		apiErr := &Error{
			StatusCode: resp.StatusCode,
			Message:    "API error",
		}
		if resp.StatusCode == 429 {
			apiErr.Message = "Rate limit exceeded"
			if retryAfter := resp.Header.Get("Retry-After"); retryAfter != "" {
				apiErr.RetryAfter, _ = strconv.Atoi(retryAfter)
			}
		} else if resp.StatusCode == 404 {
			apiErr.Message = "Resource not found"
		} else if resp.StatusCode == 401 {
			apiErr.Message = "Invalid or missing API key"
		}
		return nil, apiErr
	}

	return body, nil
}

// Product represents a SafeScoring product.
type Product struct {
	Slug        string            `json:"slug"`
	Name        string            `json:"name"`
	Description string            `json:"description,omitempty"`
	Type        string            `json:"type,omitempty"`
	TypeSlug    string            `json:"typeSlug,omitempty"`
	URL         string            `json:"url,omitempty"`
	Score       int               `json:"score"`
	Scores      *PillarScores     `json:"scores,omitempty"`
	LastUpdated string            `json:"lastUpdated,omitempty"`
	Incidents   []Incident        `json:"incidents,omitempty"`
	History     []ScoreHistory    `json:"scoreHistory,omitempty"`
}

// PillarScores represents the SAFE pillar scores.
type PillarScores struct {
	S int `json:"s"` // Security
	A int `json:"a"` // Adversity
	F int `json:"f"` // Fidelity
	E int `json:"e"` // Efficiency
}

// ScoreHistory represents a historical score entry.
type ScoreHistory struct {
	Score  int           `json:"score"`
	Scores *PillarScores `json:"scores,omitempty"`
	Date   string        `json:"date"`
}

// Incident represents a security incident.
type Incident struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Severity    string `json:"severity"`
	Date        string `json:"date"`
	FundsLost   int64  `json:"fundsLost,omitempty"`
	Status      string `json:"status,omitempty"`
	ImpactLevel string `json:"impactLevel,omitempty"`
}

// ProductsService handles product-related API calls.
type ProductsService struct {
	client *Client
}

// ProductListOptions specifies options for listing products.
type ProductListOptions struct {
	Page     int
	Limit    int
	Type     string
	MinScore int
	MaxScore int
	Sort     string
	Order    string
}

// ProductResponse wraps the API response for a single product.
type ProductResponse struct {
	Success bool     `json:"success"`
	Data    *Product `json:"data"`
}

// ProductListResponse wraps the API response for product listing.
type ProductListResponse struct {
	Success bool       `json:"success"`
	Data    []Product  `json:"data"`
	Meta    *ListMeta  `json:"meta,omitempty"`
}

// ListMeta contains pagination metadata.
type ListMeta struct {
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	Total      int `json:"total"`
	TotalPages int `json:"totalPages"`
}

// List returns a list of products with optional filtering.
func (s *ProductsService) List(opts *ProductListOptions) (*ProductListResponse, error) {
	params := url.Values{}
	if opts != nil {
		if opts.Page > 0 {
			params.Set("page", strconv.Itoa(opts.Page))
		}
		if opts.Limit > 0 {
			params.Set("limit", strconv.Itoa(opts.Limit))
		}
		if opts.Type != "" {
			params.Set("type", opts.Type)
		}
		if opts.MinScore > 0 {
			params.Set("minScore", strconv.Itoa(opts.MinScore))
		}
		if opts.MaxScore > 0 {
			params.Set("maxScore", strconv.Itoa(opts.MaxScore))
		}
		if opts.Sort != "" {
			params.Set("sort", opts.Sort)
		}
		if opts.Order != "" {
			params.Set("order", opts.Order)
		}
	}

	body, err := s.client.request("GET", "/products", params)
	if err != nil {
		return nil, err
	}

	var resp ProductListResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// Get returns a single product by slug.
func (s *ProductsService) Get(slug string) (*Product, error) {
	body, err := s.client.request("GET", "/products/"+slug, nil)
	if err != nil {
		return nil, err
	}

	var resp ProductResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, err
	}
	return resp.Data, nil
}

// GetScore returns just the score for a product.
func (s *ProductsService) GetScore(slug string) (int, error) {
	product, err := s.Get(slug)
	if err != nil {
		return 0, err
	}
	return product.Score, nil
}

// IncidentsService handles incident-related API calls.
type IncidentsService struct {
	client *Client
}

// IncidentListOptions specifies options for listing incidents.
type IncidentListOptions struct {
	Severity    string
	ProductSlug string
	Limit       int
}

// IncidentListResponse wraps the API response for incident listing.
type IncidentListResponse struct {
	Success bool       `json:"success"`
	Data    []Incident `json:"data"`
}

// List returns a list of security incidents.
func (s *IncidentsService) List(opts *IncidentListOptions) (*IncidentListResponse, error) {
	params := url.Values{}
	if opts != nil {
		if opts.Severity != "" {
			params.Set("severity", opts.Severity)
		}
		if opts.ProductSlug != "" {
			params.Set("product", opts.ProductSlug)
		}
		if opts.Limit > 0 {
			params.Set("limit", strconv.Itoa(opts.Limit))
		}
	}

	body, err := s.client.request("GET", "/incidents", params)
	if err != nil {
		return nil, err
	}

	var resp IncidentListResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// StatsService handles stats-related API calls.
type StatsService struct {
	client *Client
}

// GlobalStats represents global SafeScoring statistics.
type GlobalStats struct {
	TotalProducts int     `json:"totalProducts"`
	TotalNorms    int     `json:"totalNorms"`
	TotalTypes    int     `json:"totalTypes"`
	AvgScore      float64 `json:"avgScore"`
}

// StatsResponse wraps the API response for stats.
type StatsResponse struct {
	Success bool         `json:"success"`
	Data    *GlobalStats `json:"data"`
}

// Get returns global statistics.
func (s *StatsService) Get() (*GlobalStats, error) {
	body, err := s.client.request("GET", "/stats", nil)
	if err != nil {
		return nil, err
	}

	var resp StatsResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, err
	}
	return resp.Data, nil
}

// Leaderboard returns top-scoring products.
func (c *Client) Leaderboard(limit int, productType string) ([]Product, error) {
	opts := &ProductListOptions{
		Limit: limit,
		Sort:  "score",
		Order: "desc",
		Type:  productType,
	}
	resp, err := c.Products.List(opts)
	if err != nil {
		return nil, err
	}
	return resp.Data, nil
}

// Compare compares two products and returns the winner.
func (c *Client) Compare(slug1, slug2 string) (winner string, scoreDiff int, err error) {
	p1, err := c.Products.Get(slug1)
	if err != nil {
		return "", 0, err
	}
	p2, err := c.Products.Get(slug2)
	if err != nil {
		return "", 0, err
	}

	if p1.Score >= p2.Score {
		return slug1, p1.Score - p2.Score, nil
	}
	return slug2, p2.Score - p1.Score, nil
}
