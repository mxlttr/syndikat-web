# frozen_string_literal: true

# Minimal multilingual support.
#
# - Every page/document has a `lang` (set through front matter defaults in _config.yml).
# - The default language lives at the site root; other languages live under `/<lang>/`.
# - Translations are paired by URL (`/about/` <-> `/en/about/`), or explicitly via a shared `ref`.
# - UI strings come from `_data/i18n/<lang>.yml`, localized data files from `_data/<lang>/`.
module Jekyll
  module I18n
    module_function

    def languages(site)
      Array(site.config["languages"] || ["de"])
    end

    def default_lang(site)
      languages(site).first
    end

    def lang_of(site, item)
      item.data["lang"] || default_lang(site)
    end

    # URL without the language prefix, used as the key that pairs translations.
    def neutral_url(site, url, lang)
      return url if lang == default_lang(site)

      url.sub(%r!\A/#{Regexp.escape(lang)}(?=/|\z)!, "").then { |u| u.empty? ? "/" : u }
    end

    def localize_url(site, url, lang)
      url = url.to_s
      return url if lang == default_lang(site)
      return url unless url.start_with?("/") && !url.start_with?("//")
      return url if url.start_with?("/assets/")
      return url if languages(site).any? { |l| url == "/#{l}" || url.start_with?("/#{l}/") }

      "/#{lang}#{url}"
    end

    def translatable_items(site)
      (site.pages + site.documents.select(&:write?)).select { |item| item.output_ext == ".html" }
    end

    def dig(hash, key)
      key.to_s.split(".").reduce(hash) do |node, part|
        case node
        when Hash then node[part]
        when Array then part.match?(%r!\A\d+\z!) ? node[part.to_i] : nil
        end
      end
    end

    # Pair every page with its counterparts in the other languages once all generators have run.
    Jekyll::Hooks.register :site, :pre_render do |site|
      items = translatable_items(site)
      index = Hash.new { |hash, key| hash[key] = {} }
      keys = {}

      items.each do |item|
        lang = lang_of(site, item)
        key = item.data["ref"] || neutral_url(site, item.url, lang)
        keys[item] = key
        index[key][lang] ||= item.url
      end

      items.each { |item| item.data["translations"] = index[keys[item]] }
    end
  end

  class I18nPager
    attr_reader :data

    def initialize(data)
      @data = data
    end

    def to_liquid
      @data
    end
  end

  # Paginates a collection for pages that set `paginate_collection: <name>` (jekyll-paginate only
  # handles `site.posts` on a single index page). Output mirrors jekyll-paginate's `paginator`.
  class I18nPagination < Generator
    safe true
    priority :low

    def generate(site)
      per_page = site.config["paginate"].to_i
      return unless per_page.positive?

      site.pages.select { |page| page.data["paginate_collection"] }.each do |template|
        collection = site.collections[template.data["paginate_collection"]]
        raise Errors::FatalException, "Unknown collection '#{template.data["paginate_collection"]}' in #{template.path}" unless collection

        docs = collection.docs.select(&:write?).reverse
        total_pages = [(docs.size.to_f / per_page).ceil, 1].max

        (1..total_pages).each do |num|
          page = num == 1 ? template : clone_page(site, template, num)
          page.pager = I18nPager.new(pager_data(template, docs, per_page, num, total_pages))
          site.pages << page unless num == 1
        end
      end
    end

    private

    def clone_page(site, template, num)
      page = Page.new(site, site.source, template.instance_variable_get(:@dir), template.name)
      page.dir = page_path(template, num)
      page
    end

    def page_path(template, num)
      num == 1 ? template.url : File.join(template.url, "page#{num}", "/")
    end

    def pager_data(template, docs, per_page, num, total_pages)
      {
        "page"               => num,
        "per_page"           => per_page,
        "posts"              => docs.slice((num - 1) * per_page, per_page) || [],
        "total_posts"        => docs.size,
        "total_pages"        => total_pages,
        "previous_page"      => num > 1 ? num - 1 : nil,
        "previous_page_path" => num > 1 ? page_path(template, num - 1) : nil,
        "next_page"          => num < total_pages ? num + 1 : nil,
        "next_page_path"     => num < total_pages ? page_path(template, num + 1) : nil,
      }
    end
  end

  module I18nFilters
    # {{ 'pagination.count' | t: page: 1, total: 3 }} -> "Seite 1 von 3"
    # `fallback:` is returned when the key is missing in the current language.
    def t(key, options = {})
      site = @context.registers[:site]
      lang = i18n_lang
      dictionaries = site.data["i18n"] || {}
      value = I18n.dig(dictionaries[lang], key)
      if value.nil? && options.key?("fallback")
        value = options["fallback"]
      elsif value.nil?
        value = I18n.dig(dictionaries[I18n.default_lang(site)], key)
        Jekyll.logger.warn "i18n:", "Missing '#{key}' for '#{lang}' in #{@context.registers[:page]&.[]("path")}"
      end
      return key if value.nil?
      return value unless value.is_a?(String)

      value.gsub(%r!%\{(\w+)\}!) { options.fetch(Regexp.last_match(1), "").to_s }
    end

    # Date with the month name from the current language's dictionary.
    def localize_date(input)
      return input if input.nil? || input == ""

      date = Liquid::Utils.to_date(input)
      return input unless date

      month = t("months")[date.month - 1]
      t("date_format").gsub("%B", month).then { |format| date.strftime(format) }
    end

    # {{ '/register/' | localize_url }} -> '/en/register/' on English pages.
    def localize_url(url)
      I18n.localize_url(@context.registers[:site], url, i18n_lang)
    end

    # {% assign faqs = 'faqs' | localized_data %} reads `_data/en/faqs.yml` on English pages.
    def localized_data(path)
      site = @context.registers[:site]
      lang = i18n_lang
      unless lang == I18n.default_lang(site)
        value = I18n.dig(site.data[lang], path)
        return value unless value.nil?
      end
      I18n.dig(site.data, path)
    end

    # Posts of the current language, newest first.
    def localized_posts(_input = nil)
      site = @context.registers[:site]
      lang = i18n_lang
      return site.posts.docs.reverse if lang == I18n.default_lang(site)

      collection = site.collections["#{lang}_posts"]
      collection ? collection.docs.select(&:write?).reverse : []
    end

    # Same shape as `site.tags`: [[tag, posts], ...].
    def group_tags(posts)
      Array(posts).each_with_object({}) do |post, tags|
        post_tags = post.respond_to?(:data) ? post.data["tags"] : post["tags"]
        Array(post_tags).each { |tag| (tags[tag] ||= []) << post }
      end.to_a
    end

    private

    def i18n_lang
      page = @context.registers[:page]
      (page && page["lang"]) || I18n.default_lang(@context.registers[:site])
    end
  end
end

Liquid::Template.register_filter(Jekyll::I18nFilters)
