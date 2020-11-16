import React from "react"
import { Link, graphql } from "gatsby"
import { QueryDataCachesView } from "../../../components/query-data-caches/view"

export default function PageQueryCOtoBtoCOLinkPageB({ data, path }) {
  return (
    <>
      <QueryDataCachesView
        data={data}
        pageType="B"
        dataType="page-query"
        path={path}
      />
      <Link to="../page-A" data-testid="page-a-link">
        Go back to page A
      </Link>
    </>
  )
}

export const query = graphql`
  {
    queryDataCachesJson(selector: { eq: "page-query-CO-to-B-to-CO-link" }) {
      ...QueryDataCachesFragmentSecondPage
    }
  }
`
