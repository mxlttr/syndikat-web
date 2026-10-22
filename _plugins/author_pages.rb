# frozen_string_literal: true

module Jekyll
  class AuthorPage < PageWithoutAFile
    def initialize(site, base, author_id, author_data, permalink, lang)
      dir = permalink.sub(%r!\A/!, "").sub(%r!/+\z!, "")
      super(site, base, dir, "index.html")

      title_template = site.data.dig("i18n", lang, "author", "page_title") || "%{name}"
      data["layout"] = "author"
      data["lang"] = lang
      data["title"] = title_template.gsub("%{name}", author_data["name"])
      data["author_id"] = author_id
      data["permalink"] = permalink
    end
  end

  class AuthorPagesGenerator < Generator
    safe true
    priority :normal

    def generate(site)
      authors = site.data["authors"]
      return unless authors.is_a?(Hash)

      authors.each do |author_id, author_data|
        unless author_data.is_a?(Hash)
          raise Errors::FatalException, "Author '#{author_id}' must be a YAML object in _data/authors.yml"
        end

        name = author_data["name"].to_s.strip
        raise Errors::FatalException, "Author '#{author_id}' is missing a name in _data/authors.yml" if name.empty?

        permalink = normalize_permalink(author_id, author_data["url"])
        I18n.languages(site).each do |lang|
          localized = I18n.localize_url(site, permalink, lang)
          site.pages << AuthorPage.new(site, site.source, author_id, author_data, localized, lang)
        end
      end
    end

    private

    def normalize_permalink(author_id, route)
      route = route.to_s.strip
      raise Errors::FatalException, "Author '#{author_id}' is missing a url in _data/authors.yml" if route.empty?

      route = "/#{route}" unless route.start_with?("/")
      route = "#{route}/" unless route.end_with?("/")
      route
    end
  end
end
